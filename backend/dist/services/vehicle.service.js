"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleService = exports.VehicleService = void 0;
const models_1 = require("../models");
const trajectory_service_1 = require("./trajectory.service");
class VehicleService {
    /**
     * Normalizes license plate string for query consistency
     */
    normalizePlate(plate) {
        return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
    }
    /**
     * Retrieves vehicle details, aggregate metrics, and recent detections
     */
    async getVehicleByPlate(plate) {
        const normalized = this.normalizePlate(plate);
        const vehicle = await models_1.Vehicle.findOne({ plate: normalized }).lean();
        if (!vehicle) {
            return null;
        }
        // Fetch recent detections for this plate
        const recentDetections = await models_1.Detection.find({ plate: normalized })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();
        return {
            plate: vehicle.plate,
            firstSeen: vehicle.firstSeen,
            lastSeen: vehicle.lastSeen,
            totalDetections: vehicle.totalDetections,
            lastCameraId: vehicle.lastCameraId,
            recentDetections,
        };
    }
    /**
     * Reconstructs chronological trajectory points for a vehicle
     */
    async getVehicleTrajectory(plate) {
        return await trajectory_service_1.trajectoryEngine.reconstructTrajectory(plate);
    }
    /**
     * Lists all detected vehicles with pagination and search
     */
    async listVehicles(query) {
        const filter = {};
        if (query.search) {
            const normalizedSearch = this.normalizePlate(query.search);
            filter.plate = { $regex: normalizedSearch, $options: "i" };
        }
        const limit = Math.min(Number(query.limit) || 50, 200);
        const skip = Number(query.skip) || 0;
        const [vehicles, total] = await Promise.all([
            models_1.Vehicle.find(filter).sort({ lastSeen: -1 }).skip(skip).limit(limit).lean(),
            models_1.Vehicle.countDocuments(filter),
        ]);
        return { vehicles, total, limit, skip };
    }
}
exports.VehicleService = VehicleService;
exports.vehicleService = new VehicleService();
