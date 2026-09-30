"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const detection_service_1 = require("../services/detection.service");
const models_1 = require("../models");
async function testDetectionPipeline() {
    console.log("=== Testing ANPR Event Pipeline & Real Video Inference ===");
    await (0, db_1.connectDB)();
    console.log("\n1. Triggering real video inference for CAM-001 through Detection Pipeline...");
    const result = await detection_service_1.detectionService.processCameraVideo("CAM-001", 1);
    console.log("Pipeline Execution Result:", JSON.stringify(result, null, 2));
    if (!result.success || result.processedDetectionsCount === 0) {
        throw new Error("Video inference pipeline did not produce any detections!");
    }
    const createdDetection = result.detections[0];
    console.log(`\n2. Verifying MongoDB persistence for detection ID: ${createdDetection._id}`);
    const dbRecord = await models_1.Detection.findById(createdDetection._id);
    if (!dbRecord) {
        throw new Error("Detection record was not found in MongoDB!");
    }
    console.log("Found Detection in MongoDB:");
    console.log(` - ID: ${dbRecord._id}`);
    console.log(` - Plate: ${dbRecord.plate}`);
    console.log(` - Confidence: ${dbRecord.confidence}`);
    console.log(` - Track ID: ${dbRecord.trackId}`);
    console.log(` - Camera ID: ${dbRecord.cameraId}`);
    console.log(` - Coordinates: (${dbRecord.latitude}, ${dbRecord.longitude})`);
    console.log(` - Timestamp: ${dbRecord.timestamp.toISOString()}`);
    if (dbRecord.cameraId !== "CAM-001") {
        throw new Error(`Expected camera CAM-001, got ${dbRecord.cameraId}`);
    }
    if (!dbRecord.latitude || !dbRecord.longitude) {
        throw new Error("Camera GIS coordinates were not attached to detection!");
    }
    console.log("\n3. Verifying Vehicle Aggregate in MongoDB...");
    const vehicle = await models_1.Vehicle.findOne({ plate: dbRecord.plate });
    if (!vehicle) {
        throw new Error(`Vehicle aggregate for plate ${dbRecord.plate} was not created!`);
    }
    console.log(`✓ Vehicle found: Plate ${vehicle.plate} | Total Detections: ${vehicle.totalDetections} | Last Camera: ${vehicle.lastCameraId}`);
    console.log("\n4. Testing GET /api/cameras/CAM-001/detections query...");
    const cameraDets = await detection_service_1.detectionService.getCameraDetections("CAM-001", 5);
    console.log(`✓ Retrieved ${cameraDets.length} detections for CAM-001`);
    console.log("\n=== REAL VIDEO INFERENCE TO MONGODB TEST PASSED ===");
    await (0, db_1.disconnectDB)();
    process.exit(0);
}
testDetectionPipeline().catch(async (err) => {
    console.error("Detection pipeline test failed:", err.message);
    await (0, db_1.disconnectDB)();
    process.exit(1);
});
