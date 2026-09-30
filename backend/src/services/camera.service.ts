import { Camera, ICamera, Detection } from "../models";

export interface CameraWithStats {
  cameraId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  direction: string;
  status: "ONLINE" | "OFFLINE";
  sourceType: "VIDEO_FILE" | "WEBCAM" | "IP_CAMERA" | "SIMULATED_VIDEO" | "RTSP_STREAM" | "STATIC_IMAGE";
  videoSource?: string;
  createdAt: Date;
  detectionCount: number;
}

export class CameraService {
  async getAllCameras(): Promise<CameraWithStats[]> {
    const cameras = await Camera.find().sort({ cameraId: 1 }).lean();

    // Aggregate detection count per camera
    const detectionCounts = await Detection.aggregate([
      { $group: { _id: "$cameraId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const item of detectionCounts) {
      countMap.set(item._id, item.count);
    }

    return cameras.map((cam) => ({
      cameraId: cam.cameraId,
      name: cam.name,
      location: cam.location,
      latitude: cam.latitude,
      longitude: cam.longitude,
      direction: cam.direction,
      status: cam.status,
      sourceType: cam.sourceType,
      videoSource: cam.videoSource,
      createdAt: cam.createdAt,
      detectionCount: countMap.get(cam.cameraId) || 0,
    }));
  }

  async getCameraById(cameraId: string) {
    const camera = await Camera.findOne({ cameraId }).lean();
    if (!camera) {
      return null;
    }

    const recentDetections = await Detection.find({ cameraId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const totalDetections = await Detection.countDocuments({ cameraId });

    return {
      ...camera,
      detectionCount: totalDetections,
      recentDetections,
    };
  }

  async createCamera(cameraData: Partial<ICamera>): Promise<ICamera> {
    const existing = await Camera.findOne({ cameraId: cameraData.cameraId });
    if (existing) {
      throw new Error(`Camera with ID ${cameraData.cameraId} already exists.`);
    }

    const camera = new Camera(cameraData);
    return await camera.save();
  }

  async updateCamera(cameraId: string, updateData: Partial<ICamera>): Promise<ICamera | null> {
    const camera = await Camera.findOneAndUpdate(
      { cameraId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    return camera;
  }

  async deleteCamera(cameraId: string): Promise<boolean> {
    const result = await Camera.deleteOne({ cameraId });
    return result.deletedCount > 0;
  }

  async seedDemoCameras(): Promise<ICamera[]> {
    const demoCameras = [
      {
        cameraId: "CAM-001",
        name: "Airport Road Junction",
        location: "VIP Corridor North",
        latitude: 23.2845,
        longitude: 77.4125,
        direction: "NORTH",
        status: "ONLINE" as const,
        sourceType: "VIDEO_FILE" as const,
        videoSource: "data/videos/cam_001.mp4",
      },
      {
        cameraId: "CAM-002",
        name: "VIP Road Overpass",
        location: "Expressway Connector East",
        latitude: 23.2680,
        longitude: 77.3990,
        direction: "EAST",
        status: "ONLINE" as const,
        sourceType: "VIDEO_FILE" as const,
        videoSource: "data/videos/cam_002.mp4",
      },
      {
        cameraId: "CAM-003",
        name: "Ring Road Interchange",
        location: "Outer Bypass South",
        latitude: 23.2450,
        longitude: 77.4320,
        direction: "SOUTH",
        status: "ONLINE" as const,
        sourceType: "VIDEO_FILE" as const,
        videoSource: "data/videos/cam_003.mp4",
      },
    ];

    const results: ICamera[] = [];
    for (const demo of demoCameras) {
      const existing = await Camera.findOne({ cameraId: demo.cameraId });
      if (!existing) {
        const created = await Camera.create(demo);
        results.push(created);
      } else {
        const updated = await Camera.findOneAndUpdate(
          { cameraId: demo.cameraId },
          { $set: demo },
          { new: true }
        );
        if (updated) results.push(updated);
      }
    }

    return results;
  }

  async runMultiCameraSimulation(plate: string = "MP0AA8123") {
    await this.seedDemoCameras();
    const { detectionService } = await import("./detection.service.js");

    const now = new Date();
    const timeline = [
      { cameraId: "CAM-001", offsetMinutes: 24, trackId: 1, confidence: 0.96 },
      { cameraId: "CAM-002", offsetMinutes: 12, trackId: 4, confidence: 0.94 },
      { cameraId: "CAM-003", offsetMinutes: 0, trackId: 8, confidence: 0.97 },
    ];

    const detections = [];
    for (const step of timeline) {
      const timestamp = new Date(now.getTime() - step.offsetMinutes * 60 * 1000);
      const det = await detectionService.ingestDetection({
        plate,
        confidence: step.confidence,
        trackId: step.trackId,
        cameraId: step.cameraId,
        timestamp,
      });
      detections.push(det);
    }

    return {
      success: true,
      message: "Multi-camera trajectory simulation completed successfully.",
      plate,
      path: ["CAM-001", "CAM-002", "CAM-003"],
      detections,
    };
  }
}

export const cameraService = new CameraService();
