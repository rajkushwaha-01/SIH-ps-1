"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const models_1 = require("../models");
async function runDatabaseTest() {
    console.log("=== Starting MongoDB CRUD Operations Test ===");
    try {
        await (0, db_1.connectDB)();
        console.log("✓ Connected to MongoDB");
        // Clean up any old test artifacts
        await models_1.Camera.deleteMany({ cameraId: { $regex: /^TEST-/ } });
        await models_1.Detection.deleteMany({ plate: "TEST99AA1234" });
        await models_1.Vehicle.deleteMany({ plate: "TEST99AA1234" });
        await models_1.Alert.deleteMany({ plate: "TEST99AA1234" });
        // 1. CAMERA CRUD
        console.log("\n1. Testing Camera Model...");
        const testCamera = await models_1.Camera.create({
            cameraId: "TEST-CAM-001",
            name: "Airport Test Gate",
            location: "VIP Corridor",
            latitude: 23.2845,
            longitude: 77.4125,
            direction: "NORTH",
            status: "ONLINE",
            sourceType: "SIMULATED_VIDEO",
            videoSource: "data/videos/test.mp4",
        });
        console.log("✓ Camera created:", testCamera.cameraId);
        const foundCamera = await models_1.Camera.findOne({ cameraId: "TEST-CAM-001" });
        if (!foundCamera)
            throw new Error("Camera not found after creation");
        console.log("✓ Camera read:", foundCamera.name);
        await models_1.Camera.updateOne({ cameraId: "TEST-CAM-001" }, { status: "OFFLINE" });
        const updatedCamera = await models_1.Camera.findOne({ cameraId: "TEST-CAM-001" });
        if (updatedCamera?.status !== "OFFLINE")
            throw new Error("Camera update failed");
        console.log("✓ Camera updated: status =", updatedCamera.status);
        // 2. DETECTION CRUD
        console.log("\n2. Testing Detection Model...");
        const testDetection = await models_1.Detection.create({
            plate: "TEST99AA1234",
            confidence: 0.95,
            trackId: 42,
            cameraId: "TEST-CAM-001",
            timestamp: new Date(),
            latitude: 23.2845,
            longitude: 77.4125,
            direction: "NORTH",
            vehicleType: "CAR",
        });
        console.log("✓ Detection created for plate:", testDetection.plate);
        const foundDetection = await models_1.Detection.findOne({ plate: "TEST99AA1234" });
        if (!foundDetection)
            throw new Error("Detection not found");
        console.log("✓ Detection read with confidence:", foundDetection.confidence);
        // 3. VEHICLE CRUD
        console.log("\n3. Testing Vehicle Model...");
        const now = new Date();
        const testVehicle = await models_1.Vehicle.create({
            plate: "TEST99AA1234",
            firstSeen: now,
            lastSeen: now,
            totalDetections: 1,
            lastCameraId: "TEST-CAM-001",
        });
        console.log("✓ Vehicle record created:", testVehicle.plate);
        const updatedVehicle = await models_1.Vehicle.findOneAndUpdate({ plate: "TEST99AA1234" }, { $inc: { totalDetections: 1 }, lastSeen: new Date() }, { new: true });
        if (!updatedVehicle || updatedVehicle.totalDetections !== 2) {
            throw new Error("Vehicle update/increment failed");
        }
        console.log("✓ Vehicle updated: totalDetections =", updatedVehicle.totalDetections);
        // 4. ALERT CRUD
        console.log("\n4. Testing Alert Model...");
        const testAlert = await models_1.Alert.create({
            plate: "TEST99AA1234",
            type: "BLACKLIST_MATCH",
            cameraId: "TEST-CAM-001",
            timestamp: new Date(),
            description: "Test blacklist match alert",
            status: "ACTIVE",
        });
        console.log("✓ Alert created:", testAlert._id, testAlert.type);
        const resolvedAlert = await models_1.Alert.findByIdAndUpdate(testAlert._id, { status: "RESOLVED" }, { new: true });
        if (resolvedAlert?.status !== "RESOLVED")
            throw new Error("Alert resolution failed");
        console.log("✓ Alert updated: status =", resolvedAlert.status);
        // Clean up test data
        await models_1.Camera.deleteOne({ cameraId: "TEST-CAM-001" });
        await models_1.Detection.deleteOne({ _id: testDetection._id });
        await models_1.Vehicle.deleteOne({ plate: "TEST99AA1234" });
        await models_1.Alert.deleteOne({ _id: testAlert._id });
        console.log("\n✓ Test data cleaned up successfully");
        console.log("\n=== ALL MONGODB CRUD TESTS PASSED SUCCESSFULLY ===");
    }
    catch (err) {
        console.error("❌ MongoDB CRUD test failed:", err.message);
        process.exit(1);
    }
    finally {
        await (0, db_1.disconnectDB)();
        process.exit(0);
    }
}
runDatabaseTest();
