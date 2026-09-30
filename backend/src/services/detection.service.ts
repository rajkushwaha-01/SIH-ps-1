import path from "path";
import fs from "fs";
import { Detection, IDetection, Camera, Vehicle } from "../models";
import { mlService } from "./ml.service";
import { alertService } from "./alert.service";
import { sseService } from "./sse.service";

export interface IngestDetectionParams {
  plate: string;
  confidence: number;
  trackId: number;
  cameraId: string;
  timestamp?: Date;
  vehicleType?: string;
  imagePath?: string;
  sourceType?: "UPLOAD_IMAGE" | "UPLOAD_VIDEO" | "WEBCAM" | "VIDEO_FILE" | "IP_CAMERA";
}

export class DetectionService {
  /**
   * Normalizes license plate string (uppercase, alphanumeric only)
   */
  normalizePlate(plate: string): string {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  }

  /**
   * Ingests a single detection, attaches camera GIS coordinates,
   * stores to MongoDB, and updates vehicle aggregates.
   */
  async ingestDetection(params: IngestDetectionParams): Promise<IDetection> {
    const normalizedPlate = this.normalizePlate(params.plate);
    if (!normalizedPlate || normalizedPlate.length < 4) {
      throw new Error(`Invalid license plate text: "${params.plate}"`);
    }

    let latitude = 23.2845;
    let longitude = 77.4125;
    let direction = "UNKNOWN";
    let effectiveCamId = params.cameraId || "UPLOAD";

    const camera = await Camera.findOne({ cameraId: params.cameraId });
    if (camera) {
      latitude = camera.latitude;
      longitude = camera.longitude;
      direction = camera.direction || "UNKNOWN";
      effectiveCamId = camera.cameraId;
    }

    const timestamp = params.timestamp ? new Date(params.timestamp) : new Date();

    // 1. Create and persist detection
    const detection = await Detection.create({
      plate: normalizedPlate,
      confidence: Number(params.confidence) || 0.85,
      trackId: Number(params.trackId) || 0,
      cameraId: effectiveCamId,
      timestamp,
      latitude,
      longitude,
      direction,
      vehicleType: params.vehicleType || "CAR",
      imagePath: params.imagePath,
      sourceType: params.sourceType || (camera ? "VIDEO_FILE" : "UPLOAD_IMAGE"),
    });

    // 2. Update Vehicle aggregate record
    await Vehicle.findOneAndUpdate(
      { plate: normalizedPlate },
      {
        $setOnInsert: { firstSeen: timestamp },
        $set: { lastSeen: timestamp, lastCameraId: effectiveCamId },
        $inc: { totalDetections: 1 },
      },
      { upsert: true, new: true }
    );

    // 3. Evaluate Alert Engine Rules (Blacklist & Route Anomalies)
    try {
      await alertService.evaluateDetection(detection);
    } catch (err: any) {
      console.error(`[Detection Pipeline] Alert evaluation error: ${err.message}`);
    }

    // 4. Broadcast live detection via SSE
    sseService.broadcast("detection", detection);

    return detection;
  }

  /**
   * Automatically executes video inference for a camera using Python ML service
   * and creates persistent detections in MongoDB.
   */
  async processCameraVideo(cameraId: string, frameSkip: number = 1) {
    const camera = await Camera.findOne({ cameraId });
    if (!camera) {
      throw new Error(`Camera with ID "${cameraId}" not found.`);
    }

    if (!camera.videoSource) {
      throw new Error(`Camera "${cameraId}" has no configured videoSource.`);
    }

    // Resolve video path relative to project root
    let resolvedVideoPath = path.isAbsolute(camera.videoSource)
      ? camera.videoSource
      : path.resolve(process.cwd(), camera.videoSource);

    // If running inside backend/ directory, check relative to root
    if (!fs.existsSync(resolvedVideoPath)) {
      resolvedVideoPath = path.resolve(__dirname, "../../../", camera.videoSource);
    }

    if (!fs.existsSync(resolvedVideoPath)) {
      throw new Error(`Camera video source not found at: ${resolvedVideoPath}`);
    }

    console.log(`[Detection Pipeline] Processing video for camera ${cameraId}: ${resolvedVideoPath}`);
    sseService.broadcast("camera_status", { cameraId, status: "PROCESSING", timestamp: new Date() });

    try {
      const mlResponse = await mlService.processVideo(resolvedVideoPath, frameSkip);

      if (!mlResponse.success) {
        sseService.broadcast("camera_status", { cameraId, status: "ERROR", error: mlResponse.error });
        throw new Error(mlResponse.error || "ML service failed during video processing");
      }

      const createdDetections: IDetection[] = [];
      const now = new Date();

      for (const raw of mlResponse.detections) {
        const detection = await this.ingestDetection({
          plate: raw.plate,
          confidence: raw.confidence,
          trackId: raw.trackId,
          cameraId: camera.cameraId,
          timestamp: now,
        });
        createdDetections.push(detection);
      }

      sseService.broadcast("camera_status", {
        cameraId,
        status: "ONLINE",
        timestamp: new Date(),
        processedCount: createdDetections.length,
      });

      return {
        success: true,
        cameraId,
        processedDetectionsCount: createdDetections.length,
        detections: createdDetections,
      };
    } catch (err: any) {
      sseService.broadcast("camera_status", { cameraId, status: "ERROR", error: err.message });
      throw err;
    }
  }

  /**
   * Retrieves list of detections with optional query filters and pagination
   */
  async getDetections(query: { plate?: string; cameraId?: string; limit?: number; skip?: number }) {
    const filter: Record<string, any> = {};
    if (query.plate) {
      filter.plate = this.normalizePlate(query.plate);
    }
    if (query.cameraId) {
      filter.cameraId = query.cameraId;
    }

    const limit = Math.min(Number(query.limit) || 50, 200);
    const skip = Number(query.skip) || 0;

    const [detections, total] = await Promise.all([
      Detection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Detection.countDocuments(filter),
    ]);

    return { detections, total, limit, skip };
  }

  /**
   * Retrieves recent detections specifically for a camera
   */
  async getCameraDetections(cameraId: string, limit: number = 20) {
    return await Detection.find({ cameraId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Processes an uploaded image file via ML Service and persists valid detections
   */
  async processUploadedImage(filePath: string, publicUrl?: string) {
    const mlResponse = await mlService.processImage(filePath);
    if (!mlResponse.success) {
      throw new Error(mlResponse.error || "ML service image processing failed");
    }

    const createdDetections: IDetection[] = [];
    const now = new Date();

    for (const raw of mlResponse.detections) {
      try {
        const detection = await this.ingestDetection({
          plate: raw.plate,
          confidence: raw.confidence,
          trackId: raw.trackId || 1,
          cameraId: "UPLOAD",
          timestamp: now,
          imagePath: publicUrl || filePath,
          sourceType: "UPLOAD_IMAGE",
        });
        createdDetections.push(detection);
      } catch (e: any) {
        console.warn(`[Image Upload] Skipped invalid plate: ${raw.plate}`);
      }
    }

    return {
      success: true,
      detectionsCount: createdDetections.length,
      rawDetections: mlResponse.detections,
      detections: createdDetections,
    };
  }

  /**
   * Processes an uploaded video file via ML Service and persists valid detections
   */
  async processUploadedVideo(filePath: string, publicUrl?: string, frameSkip: number = 2) {
    const mlResponse = await mlService.processVideo(filePath, frameSkip);
    if (!mlResponse.success) {
      throw new Error(mlResponse.error || "ML service video processing failed");
    }

    const createdDetections: IDetection[] = [];
    const now = new Date();

    for (const raw of mlResponse.detections) {
      try {
        const detection = await this.ingestDetection({
          plate: raw.plate,
          confidence: raw.confidence,
          trackId: raw.trackId || 1,
          cameraId: "UPLOAD",
          timestamp: now,
          imagePath: publicUrl || filePath,
          sourceType: "UPLOAD_VIDEO",
        });
        createdDetections.push(detection);
      } catch (e: any) {
        console.warn(`[Video Upload] Skipped invalid plate: ${raw.plate}`);
      }
    }

    return {
      success: true,
      detectionsCount: createdDetections.length,
      rawDetections: mlResponse.detections,
      detections: createdDetections,
    };
  }

  /**
   * Processes a live webcam frame via ML Service and persists valid detections
   */
  async processLiveFrame(filePath: string) {
    const mlResponse = await mlService.processImage(filePath);
    if (!mlResponse.success) {
      return { success: false, error: mlResponse.error, detections: [] };
    }

    const createdDetections: IDetection[] = [];
    const now = new Date();

    for (const raw of mlResponse.detections) {
      try {
        const detection = await this.ingestDetection({
          plate: raw.plate,
          confidence: raw.confidence,
          trackId: raw.trackId || 1,
          cameraId: "CAM-WEBCAM",
          timestamp: now,
          sourceType: "WEBCAM",
        });
        createdDetections.push(detection);
      } catch (e: any) {
        // Skip invalid plate
      }
    }

    return {
      success: true,
      rawDetections: mlResponse.detections,
      detections: createdDetections,
    };
  }
}

export const detectionService = new DetectionService();
