import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/analytics.service";

export class AnalyticsController {
  async getTrafficOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await analyticsService.getTrafficOverview();
      res.status(200).json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async getCameraAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cameraStats = await analyticsService.getCameraAnalytics();
      res.status(200).json({ success: true, count: cameraStats.length, data: cameraStats });
    } catch (error) {
      next(error);
    }
  }

  async getMovements(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movements = await analyticsService.getMovements();
      res.status(200).json({ success: true, count: movements.length, data: movements });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
