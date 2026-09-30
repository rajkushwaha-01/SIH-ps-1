"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleController = exports.VehicleController = void 0;
const vehicle_service_1 = require("../services/vehicle.service");
class VehicleController {
    async listVehicles(req, res, next) {
        try {
            const { search, limit, skip } = req.query;
            const result = await vehicle_service_1.vehicleService.listVehicles({
                search: search,
                limit: limit ? parseInt(limit, 10) : undefined,
                skip: skip ? parseInt(skip, 10) : undefined,
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getVehicleByPlate(req, res, next) {
        try {
            const { plate } = req.params;
            const vehicle = await vehicle_service_1.vehicleService.getVehicleByPlate(plate);
            if (!vehicle) {
                res.status(404).json({
                    success: false,
                    error: `No vehicle found with license plate: "${plate}".`,
                });
                return;
            }
            res.status(200).json({ success: true, data: vehicle });
        }
        catch (error) {
            next(error);
        }
    }
    async getVehicleTrajectory(req, res, next) {
        try {
            const { plate } = req.params;
            const trajectory = await vehicle_service_1.vehicleService.getVehicleTrajectory(plate);
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
        }
        catch (error) {
            next(error);
        }
    }
}
exports.VehicleController = VehicleController;
exports.vehicleController = new VehicleController();
