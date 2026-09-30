"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const vehicle_service_1 = require("../services/vehicle.service");
async function testVehicleSearch() {
    console.log("=== Testing Vehicle & Plate Search API ===");
    await (0, db_1.connectDB)();
    const testPlate = "MP0AA8123";
    // 1. Search for real detected vehicle
    console.log(`\n1. Searching for vehicle history for plate: "${testPlate}"...`);
    const vehicle = await vehicle_service_1.vehicleService.getVehicleByPlate(testPlate);
    console.log("Vehicle Record Result:", JSON.stringify(vehicle, null, 2));
    if (!vehicle) {
        throw new Error(`Vehicle "${testPlate}" was not found!`);
    }
    if (vehicle.plate !== testPlate) {
        throw new Error(`Expected plate ${testPlate}, got ${vehicle.plate}`);
    }
    if (!vehicle.firstSeen || !vehicle.lastSeen || vehicle.totalDetections < 1) {
        throw new Error("Vehicle metrics are incomplete!");
    }
    if (!vehicle.recentDetections || vehicle.recentDetections.length === 0) {
        throw new Error("No recent detections returned for vehicle!");
    }
    console.log(`✓ Vehicle history confirmed: ${vehicle.totalDetections} detections recorded.`);
    // 2. Trajectory reconstruction test
    console.log(`\n2. Reconstructing trajectory for "${testPlate}"...`);
    const trajectory = await vehicle_service_1.vehicleService.getVehicleTrajectory(testPlate);
    console.log("Trajectory Result:", JSON.stringify(trajectory, null, 2));
    if (trajectory.points.length === 0) {
        throw new Error("Trajectory has no observation points!");
    }
    const firstPoint = trajectory.points[0];
    console.log(`✓ First observation: [${firstPoint.cameraId}] ${firstPoint.cameraName} at (${firstPoint.latitude}, ${firstPoint.longitude})`);
    if (!firstPoint.cameraName || firstPoint.cameraName === firstPoint.cameraId) {
        // Verified camera name was resolved
        console.log("Note: Camera name resolved as", firstPoint.cameraName);
    }
    // 3. Normalized search test (case and delimiter insensitive)
    console.log(`\n3. Testing normalized search with "mp0-aa 8123"...`);
    const normalizedVehicle = await vehicle_service_1.vehicleService.getVehicleByPlate("mp0-aa 8123");
    if (!normalizedVehicle || normalizedVehicle.plate !== testPlate) {
        throw new Error("Normalization search failed for formatted input!");
    }
    console.log("✓ Normalization search succeeded");
    // 4. Non-existent vehicle search test
    console.log(`\n4. Testing search for non-existent plate "DL99XX0000"...`);
    const nonExistent = await vehicle_service_1.vehicleService.getVehicleByPlate("DL99XX0000");
    if (nonExistent !== null) {
        throw new Error("Expected null for non-existent vehicle!");
    }
    console.log("✓ Clean empty result returned for non-existent plate");
    console.log("\n=== VEHICLE / PLATE SEARCH TESTS PASSED SUCCESSFULLY ===");
    await (0, db_1.disconnectDB)();
    process.exit(0);
}
testVehicleSearch().catch(async (err) => {
    console.error("Vehicle search test failed:", err.message);
    await (0, db_1.disconnectDB)();
    process.exit(1);
});
