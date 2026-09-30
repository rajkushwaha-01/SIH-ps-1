import { Vehicle, Detection } from "../models";
import { trajectoryEngine, ReconstructedTrajectory } from "./trajectory.service";

export class VehicleService {
  /**
   * Normalizes license plate string for query consistency
   */
  normalizePlate(plate: string): string {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  }

  /**
   * Retrieves vehicle details, aggregate metrics, and recent detections
   */
  async getVehicleByPlate(plate: string) {
    const normalized = this.normalizePlate(plate);
    const vehicle = await Vehicle.findOne({ plate: normalized }).lean();

    if (!vehicle) {
      return null;
    }

    // Fetch recent detections for this plate
    const recentDetections = await Detection.find({ plate: normalized })
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
  async getVehicleTrajectory(plate: string): Promise<ReconstructedTrajectory> {
    return await trajectoryEngine.reconstructTrajectory(plate);
  }

  /**
   * Lists all detected vehicles with pagination and search
   */
  async listVehicles(query: { search?: string; limit?: number; skip?: number }) {
    const filter: Record<string, any> = {};
    if (query.search) {
      const normalizedSearch = this.normalizePlate(query.search);
      filter.plate = { $regex: normalizedSearch, $options: "i" };
    }

    const limit = Math.min(Number(query.limit) || 50, 200);
    const skip = Number(query.skip) || 0;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter).sort({ lastSeen: -1 }).skip(skip).limit(limit).lean(),
      Vehicle.countDocuments(filter),
    ]);

    return { vehicles, total, limit, skip };
  }
}

export const vehicleService = new VehicleService();
