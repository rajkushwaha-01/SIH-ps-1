import { Request, Response, NextFunction } from "express";
import { vehicleService } from "../services/vehicle.service";

export class VehicleController {
  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, limit, skip } = req.query;
      const result = await vehicleService.listVehicles({
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        skip: skip ? parseInt(skip as string, 10) : undefined,
      });

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getVehicleByPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate } = req.params;
      const vehicle = await vehicleService.getVehicleByPlate(plate);

      if (!vehicle) {
        res.status(404).json({
          success: false,
          error: `No vehicle found with license plate: "${plate}".`,
        });
        return;
      }

      res.status(200).json({ success: true, data: vehicle });
    } catch (error) {
      next(error);
    }
  }

  async getVehicleTrajectory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { plate } = req.params;
      const trajectory = await vehicleService.getVehicleTrajectory(plate);

      if (trajectory.points.length === 0) {
        res.status(404).json({
          success: false,
          error: `No camera trajectory observations found for vehicle: "${plate}".`,
          plate: trajectory.plate,
          points: [],
        });
        return;
      }

      res.status(200).json({ success: true, data: trajectory });
    } catch (error) {
      next(error);
    }
  }
}

export const vehicleController = new VehicleController();
