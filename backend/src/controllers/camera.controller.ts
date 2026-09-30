import { Request, Response, NextFunction } from "express";
import { cameraService } from "../services/camera.service";

export class CameraController {
  async getAllCameras(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cameras = await cameraService.getAllCameras();
      res.status(200).json({ success: true, count: cameras.length, data: cameras });
    } catch (error) {
      next(error);
    }
  }

  async getCameraById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const camera = await cameraService.getCameraById(cameraId);
      if (!camera) {
        res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
        return;
      }
      res.status(200).json({ success: true, data: camera });
    } catch (error) {
      next(error);
    }
  }

  async createCamera(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId, name, location, latitude, longitude, direction, status, sourceType, videoSource } = req.body;

      if (!cameraId || !name || !location || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          error: "Missing required camera fields (cameraId, name, location, latitude, longitude).",
        });
        return;
      }

      const camera = await cameraService.createCamera({
        cameraId,
        name,
        location,
        latitude: Number(latitude),
        longitude: Number(longitude),
        direction: direction || "NORTH",
        status: status || "ONLINE",
        sourceType: sourceType || "SIMULATED_VIDEO",
        videoSource,
      });

      res.status(201).json({ success: true, data: camera });
    } catch (error) {
      next(error);
    }
  }

  async updateCamera(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const updated = await cameraService.updateCamera(cameraId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
        return;
      }
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteCamera(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cameraId } = req.params;
      const deleted = await cameraService.deleteCamera(cameraId);
      if (!deleted) {
        res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
        return;
      }
      res.status(200).json({ success: true, message: `Camera ${cameraId} deleted successfully.` });
    } catch (error) {
      next(error);
    }
  }

  async seedCameras(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cameras = await cameraService.seedDemoCameras();
      res.status(200).json({ success: true, message: "Demo cameras seeded successfully.", data: cameras });
    } catch (error) {
      next(error);
    }
  }

  async runSimulation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plate = (req.body?.plate as string) || "MP0AA8123";
      const result = await cameraService.runMultiCameraSimulation(plate);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const cameraController = new CameraController();
