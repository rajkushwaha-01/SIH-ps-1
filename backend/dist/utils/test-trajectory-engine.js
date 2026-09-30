"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const trajectory_service_1 = require("../services/trajectory.service");
const detection_service_1 = require("../services/detection.service");
const models_1 = require("../models");
async function testTrajectoryEngine() {
    console.log("=== Testing Trajectory Engine with Actual Database Records ===");
    await (0, db_1.connectDB)();
    const plate = "MP0AA8123";
    const baseTime = new Date("2026-09-29T10:00:00Z");
    // Ingest multi-camera chronological observations
    console.log("\n1. Ingesting multi-camera observations for plate:", plate);
    // Clear previous test detections for deterministic test
    await models_1.Detection.deleteMany({ plate });
    // CAM-001 at 10:02
    const t1 = new Date(baseTime.getTime() + 2 * 60 * 1000);
    await detection_service_1.detectionService.ingestDetection({
        plate,
        confidence: 0.95,
        trackId: 1,
        cameraId: "CAM-001",
        timestamp: t1,
    });
    console.log("✓ Ingested CAM-001 observation at 10:02");
    // Duplicate read at CAM-001 5 seconds later (should be deduplicated by trajectory engine)
    await detection_service_1.detectionService.ingestDetection({
        plate,
        confidence: 0.94,
        trackId: 1,
        cameraId: "CAM-001",
        timestamp: new Date(t1.getTime() + 5000),
    });
    console.log("✓ Ingested duplicate CAM-001 observation (5s later)");
    // CAM-002 at 10:14
    const t2 = new Date(baseTime.getTime() + 14 * 60 * 1000);
    await detection_service_1.detectionService.ingestDetection({
        plate,
        confidence: 0.93,
        trackId: 4,
        cameraId: "CAM-002",
        timestamp: t2,
    });
    console.log("✓ Ingested CAM-002 observation at 10:14");
    // CAM-003 at 10:26
    const t3 = new Date(baseTime.getTime() + 26 * 60 * 1000);
    await detection_service_1.detectionService.ingestDetection({
        plate,
        confidence: 0.96,
        trackId: 7,
        cameraId: "CAM-003",
        timestamp: t3,
    });
    console.log("✓ Ingested CAM-003 observation at 10:26");
    // 2. Reconstruct trajectory
    console.log("\n2. Calling Trajectory Engine...");
    const trajectory = await trajectory_service_1.trajectoryEngine.reconstructTrajectory(plate);
    console.log("Reconstructed Trajectory Result:");
    console.log(JSON.stringify(trajectory, null, 2));
    // 3. Assertions
    if (trajectory.trackingType !== "CAMERA_OBSERVATION_POINTS") {
        throw new Error("Invalid tracking type! Must indicate discrete camera observation points.");
    }
    if (trajectory.points.length !== 3) {
        throw new Error(`Expected exactly 3 points (duplicate removed), got ${trajectory.points.length}`);
    }
    const expectedSequence = ["CAM-001", "CAM-002", "CAM-003"];
    for (let i = 0; i < 3; i++) {
        const pt = trajectory.points[i];
        if (pt.cameraId !== expectedSequence[i]) {
            throw new Error(`Expected point ${i} to be ${expectedSequence[i]}, got ${pt.cameraId}`);
        }
        if (!pt.latitude || !pt.longitude || !pt.cameraName) {
            throw new Error(`Point ${i} missing GIS coordinates or camera name!`);
        }
        console.log(` - Point ${i + 1}: [${pt.cameraId}] "${pt.cameraName}" | Time: ${pt.timestamp} | GIS: (${pt.latitude}, ${pt.longitude}) | Elapsed: ${pt.timeFromPreviousMinutes ?? 0}m`);
    }
    console.log("\n=== TRAJECTORY ENGINE TESTS PASSED WITH ACTUAL DATABASE RECORDS ===");
    await (0, db_1.disconnectDB)();
    process.exit(0);
}
testTrajectoryEngine().catch(async (err) => {
    console.error("Trajectory engine test failed:", err.message);
    await (0, db_1.disconnectDB)();
    process.exit(1);
});
