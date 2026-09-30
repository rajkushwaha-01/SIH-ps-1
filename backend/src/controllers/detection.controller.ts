import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { detectionService } from "../services/detection.service";

export class DetectionController {
  async ingestDetection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate, confidence, trackId, cameraId, timestamp, vehicleType, imagePath } = req.body;

      if (!plate || !cameraId) {
        res.status(400).json({ success: false, error: "Missing required fields (plate, cameraId)." });
        return;
      }

      const detection = await detectionService.ingestDetection({
        plate,
        confidence: Number(confidence) || 0.85,
        trackId: Number(trackId) || 0,
        cameraId,
        timestamp: timestamp ? new Date(timestamp) : undefined,
        vehicleType,
        imagePath,
      });

      res.status(201).json({ success: true, data: detection });
    } catch (error) {
      next(error);
    }
  }

  async getDetections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate, cameraId, limit, skip } = req.query;
      const result = await detectionService.getDetections({
        plate: plate as string,
        cameraId: cameraId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        skip: skip ? parseInt(skip as string, 10) : undefined,
      });

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getCameraDetections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const detections = await detectionService.getCameraDetections(cameraId, limit);

      res.status(200).json({ success: true, count: detections.length, data: detections });
    } catch (error) {
      next(error);
    }
  }

  async processCameraVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const frameSkip = req.query.frameSkip ? parseInt(req.query.frameSkip as string, 10) : 1;

      const result = await detectionService.processCameraVideo(cameraId, frameSkip);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async processImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No image file provided." });
        return;
      }

      const publicUrl = `/data/uploads/${req.file.filename}`;
      const result = await detectionService.processUploadedImage(req.file.path, publicUrl);

      res.status(200).json({
        success: true,
        imageUrl: publicUrl,
        detectionsCount: result.detectionsCount,
        detections: result.detections,
        rawDetections: result.rawDetections,
      });
    } catch (error) {
      next(error);
    }
  }

  async processVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No video file provided." });
        return;
      }

      const frameSkip = req.query.frameSkip ? parseInt(req.query.frameSkip as string, 10) : 2;
      const publicUrl = `/data/uploads/${req.file.filename}`;
      const result = await detectionService.processUploadedVideo(req.file.path, publicUrl, frameSkip);

      res.status(200).json({
        success: true,
        videoUrl: publicUrl,
        detectionsCount: result.detectionsCount,
        detections: result.detections,
        rawDetections: result.rawDetections,
      });
    } catch (error) {
      next(error);
    }
  }

  async processLiveInference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let filePath: string | null = null;

      if (req.file) {
        filePath = req.file.path;
      } else if (req.body.image || req.body.frame) {
        // Base64 data URL
        const rawStr = req.body.image || req.body.frame;
        const base64Data = rawStr.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const uploadsDir = path.resolve(process.cwd(), "data/uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        filePath = path.join(uploadsDir, `live-frame-${Date.now()}.jpg`);
        fs.writeFileSync(filePath, buffer);
      }

      if (!filePath) {
        res.status(400).json({ success: false, error: "No frame image provided." });
        return;
      }

      const result = await detectionService.processLiveFrame(filePath);

      // Clean up temporary frame after processing to prevent disk filling
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}

      res.status(200).json({
        success: true,
        detections: result.detections,
        rawDetections: result.rawDetections,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const detectionController = new DetectionController();
