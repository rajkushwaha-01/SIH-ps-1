"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const camera_service_1 = require("../services/camera.service");
async function testCameraManagement() {
    console.log("=== Testing Camera Management & Registration ===");
    await (0, db_1.connectDB)();
    // 1. Seed demo cameras
    console.log("1. Seeding 3 demo cameras...");
    const seeded = await camera_service_1.cameraService.seedDemoCameras();
    console.log(`✓ Seeded ${seeded.length} cameras`);
    // 2. Fetch all cameras
    console.log("\n2. Fetching all cameras from database...");
    const cameras = await camera_service_1.cameraService.getAllCameras();
    console.log(`Total cameras registered: ${cameras.length}`);
    cameras.forEach((c) => {
        console.log(` - [${c.cameraId}] ${c.name} | Loc: ${c.location} | Lat: ${c.latitude}, Lng: ${c.longitude} | Source: ${c.sourceType} (${c.videoSource}) | Status: ${c.status}`);
    });
    if (cameras.length < 3) {
        throw new Error(`Expected at least 3 cameras, found ${cameras.length}`);
    }
    // 3. Verify specific camera details
    console.log("\n3. Testing getCameraById('CAM-001')...");
    const cam1 = await camera_service_1.cameraService.getCameraById("CAM-001");
    if (!cam1)
        throw new Error("CAM-001 not found");
    console.log(`✓ Retrieved CAM-001: ${cam1.name}`);
    // 4. Test updating camera status
    console.log("\n4. Testing updateCamera('CAM-002')...");
    const updated = await camera_service_1.cameraService.updateCamera("CAM-002", { direction: "EAST" });
    if (updated?.direction !== "EAST")
        throw new Error("Update direction failed");
    console.log(`✓ Updated CAM-002 direction: ${updated.direction}`);
    console.log("\n=== CAMERA MANAGEMENT TESTS PASSED (>= 3 CAMERAS REGISTERED) ===");
    await (0, db_1.disconnectDB)();
    process.exit(0);
}
testCameraManagement().catch(async (err) => {
    console.error("Camera management test failed:", err.message);
    await (0, db_1.disconnectDB)();
    process.exit(1);
});
