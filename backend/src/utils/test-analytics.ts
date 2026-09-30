import { connectDB, disconnectDB } from "../config/db";
import { analyticsService } from "../services/analytics.service";
import { Detection, Vehicle } from "../models";

async function testAnalytics() {
  console.log("=== Testing Traffic Analytics Engine with Actual Stored Data ===");
  await connectDB();

  // 1. Traffic Overview Test
  console.log("\n1. Testing GET /api/analytics/traffic (Traffic Overview)...");
  const overview = await analyticsService.getTrafficOverview();
  console.log("Overview Data:", JSON.stringify(overview, null, 2));

  const actualDetectionCount = await Detection.countDocuments();
  const actualVehicleCount = await Vehicle.countDocuments();

  if (overview.totalDetections !== actualDetectionCount) {
    throw new Error(`Overview detection count mismatch: expected ${actualDetectionCount}, got ${overview.totalDetections}`);
  }
  if (overview.uniqueVehicles !== actualVehicleCount) {
    throw new Error(`Overview unique vehicles mismatch: expected ${actualVehicleCount}, got ${overview.uniqueVehicles}`);
  }
  if (overview.averageSpeed !== "No data available") {
    throw new Error(`Average speed must be 'No data available' without radar/speed sensors! Found: ${overview.averageSpeed}`);
  }
  console.log(`✓ Traffic overview matches actual DB: ${overview.totalDetections} detections, ${overview.uniqueVehicles} vehicles.`);

  // 2. Camera Analytics Test
  console.log("\n2. Testing GET /api/analytics/cameras (Per-Camera Volume & Congestion)...");
  const cameraStats = await analyticsService.getCameraAnalytics();
  console.log("Camera Stats:", JSON.stringify(cameraStats, null, 2));

  if (cameraStats.length < 3) {
    throw new Error(`Expected at least 3 cameras, got ${cameraStats.length}`);
  }

  for (const cam of cameraStats) {
    const expectedCount = await Detection.countDocuments({ cameraId: cam.cameraId });
    if (cam.detectionCount !== expectedCount) {
      throw new Error(`Camera ${cam.cameraId} count mismatch: expected ${expectedCount}, got ${cam.detectionCount}`);
    }
    console.log(` - Camera [${cam.cameraId}]: ${cam.detectionCount} detections | ${cam.uniqueVehicles} unique vehicles | Congestion: ${cam.congestion}`);
  }
  console.log("✓ Camera analytics match actual per-camera database documents.");

  // 3. Movement / OD Matrix Test
  console.log("\n3. Testing GET /api/analytics/movements (Origin-Destination Movement Patterns)...");
  const movements = await analyticsService.getMovements();
  console.log("Movements Result:", JSON.stringify(movements, null, 2));

  if (movements.length > 0) {
    const top = movements[0];
    console.log(`✓ Dominant flow: ${top.originCameraId} (${top.originName}) -> ${top.destinationCameraId} (${top.destinationName}) | ${top.movementCount} trips | Avg: ${top.avgTravelMinutes} min`);
  } else {
    console.log("No multi-camera transitions recorded yet.");
  }

  console.log("\n=== TRAFFIC ANALYTICS TESTS PASSED (CALCULATED FROM ACTUAL DETECTIONS) ===");
  await disconnectDB();
  process.exit(0);
}

testAnalytics().catch(async (err) => {
  console.error("Analytics test failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
