import { Detection, Camera, Vehicle } from "../models";

export class AnalyticsService {
  /**
   * Retrieves high-level city-wide traffic volume, unique vehicles, and hourly distribution.
   */
  async getTrafficOverview() {
    const [totalDetections, uniqueVehicles, activeCameras, totalCameras] = await Promise.all([
      Detection.countDocuments(),
      Vehicle.countDocuments(),
      Camera.countDocuments({ status: "ONLINE" }),
      Camera.countDocuments(),
    ]);

    // Hourly detection trend (grouped by UTC hour)
    const hourlyAggregation = await Detection.aggregate([
      {
        $group: {
          _id: { $hour: "$timestamp" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyTrend = Array.from({ length: 24 }, (_, hour) => {
      const match = hourlyAggregation.find((item) => item._id === hour);
      return {
        hour: `${hour.toString().padStart(2, "0")}:00`,
        detections: match ? match.count : 0,
      };
    });

    // City-wide traffic density evaluation based on detection volume
    let congestionIndicator: "LOW" | "MODERATE" | "HIGH" = "LOW";
    if (totalDetections > 100) {
      congestionIndicator = "HIGH";
    } else if (totalDetections > 25) {
      congestionIndicator = "MODERATE";
    }

    return {
      totalDetections,
      uniqueVehicles,
      activeCameras,
      totalCameras,
      congestionIndicator,
      averageSpeed: "No data available", // Strictly no fake speed metric
      hourlyTrend,
    };
  }

  /**
   * Retrieves per-camera traffic density, detection count, and unique vehicles.
   */
  async getCameraAnalytics() {
    const cameras = await Camera.find().lean();

    // Group detections by camera
    const detectionAgg = await Detection.aggregate([
      {
        $group: {
          _id: "$cameraId",
          detectionCount: { $sum: 1 },
          uniquePlates: { $addToSet: "$plate" },
          lastDetection: { $max: "$timestamp" },
        },
      },
    ]);

    const statsMap = new Map<string, { detectionCount: number; uniqueVehicles: number; lastDetection: Date | null }>();
    for (const item of detectionAgg) {
      statsMap.set(item._id, {
        detectionCount: item.detectionCount,
        uniqueVehicles: item.uniquePlates.length,
        lastDetection: item.lastDetection,
      });
    }

    return cameras.map((cam) => {
      const stat = statsMap.get(cam.cameraId) || { detectionCount: 0, uniqueVehicles: 0, lastDetection: null };

      let congestion: "LOW" | "MODERATE" | "HIGH" = "LOW";
      if (stat.detectionCount > 30) {
        congestion = "HIGH";
      } else if (stat.detectionCount > 10) {
        congestion = "MODERATE";
      }

      return {
        cameraId: cam.cameraId,
        name: cam.name,
        location: cam.location,
        status: cam.status,
        detectionCount: stat.detectionCount,
        uniqueVehicles: stat.uniqueVehicles,
        congestion,
        lastDetection: stat.lastDetection,
      };
    });
  }

  /**
   * Reconstructs actual camera-to-camera movement patterns (Origin-Destination matrix).
   */
  async getMovements() {
    // Fetch all detections sorted by plate and timestamp
    const detections = await Detection.find()
      .sort({ plate: 1, timestamp: 1 })
      .lean();

    const cameras = await Camera.find().lean();
    const cameraNameMap = new Map<string, string>();
    cameras.forEach((c) => cameraNameMap.set(c.cameraId, c.name));

    // Calculate sequential camera-to-camera transitions per vehicle
    const movementMap = new Map<string, { count: number; totalMinutes: number }>();

    for (let i = 0; i < detections.length - 1; i++) {
      const curr = detections[i];
      const next = detections[i + 1];

      // Only transition between observations of the exact same vehicle
      if (curr.plate === next.plate && curr.cameraId !== next.cameraId) {
        const key = `${curr.cameraId}->${next.cameraId}`;
        const diffMs = new Date(next.timestamp).getTime() - new Date(curr.timestamp).getTime();
        const diffMin = Math.max(0, diffMs / (1000 * 60));

        const existing = movementMap.get(key) || { count: 0, totalMinutes: 0 };
        existing.count += 1;
        existing.totalMinutes += diffMin;
        movementMap.set(key, existing);
      }
    }

    const movements = Array.from(movementMap.entries()).map(([key, data]) => {
      const [from, to] = key.split("->");
      return {
        originCameraId: from,
        originName: cameraNameMap.get(from) || from,
        destinationCameraId: to,
        destinationName: cameraNameMap.get(to) || to,
        movementCount: data.count,
        avgTravelMinutes: Math.round((data.totalMinutes / data.count) * 10) / 10,
      };
    });

    return movements.sort((a, b) => b.movementCount - a.movementCount);
  }
}

export const analyticsService = new AnalyticsService();
