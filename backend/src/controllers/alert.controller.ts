import { Request, Response, NextFunction } from "express";
import { alertService } from "../services/alert.service";

export class AlertController {
  async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, limit, skip } = req.query;
      const result = await alertService.getAlerts({
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        skip: skip ? parseInt(skip as string, 10) : undefined,
      });

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const alert = await alertService.resolveAlert(id);

      if (!alert) {
        res.status(404).json({ success: false, error: `Alert with ID ${id} not found.` });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Alert resolved successfully.",
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  getBlacklist(_req: Request, res: Response): void {
    const list = alertService.getBlacklist();
    res.status(200).json({ success: true, count: list.length, data: list });
  }
}

export const alertController = new AlertController();
