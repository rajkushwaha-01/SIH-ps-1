import { connectDB, disconnectDB } from "../config/db";
import { cameraService } from "../services/camera.service";

async function testCameraManagement() {
  console.log("=== Testing Camera Management & Registration ===");
  await connectDB();

  // 1. Seed demo cameras
  console.log("1. Seeding 3 demo cameras...");
  const seeded = await cameraService.seedDemoCameras();
  console.log(`✓ Seeded ${seeded.length} cameras`);

  // 2. Fetch all cameras
  console.log("\n2. Fetching all cameras from database...");
  const cameras = await cameraService.getAllCameras();
  console.log(`Total cameras registered: ${cameras.length}`);
  cameras.forEach((c) => {
    console.log(` - [${c.cameraId}] ${c.name} | Loc: ${c.location} | Lat: ${c.latitude}, Lng: ${c.longitude} | Source: ${c.sourceType} (${c.videoSource}) | Status: ${c.status}`);
  });

  if (cameras.length < 3) {
    throw new Error(`Expected at least 3 cameras, found ${cameras.length}`);
  }

  // 3. Verify specific camera details
  console.log("\n3. Testing getCameraById('CAM-001')...");
  const cam1 = await cameraService.getCameraById("CAM-001");
  if (!cam1) throw new Error("CAM-001 not found");
  console.log(`✓ Retrieved CAM-001: ${cam1.name}`);

  // 4. Test updating camera status
  console.log("\n4. Testing updateCamera('CAM-002')...");
  const updated = await cameraService.updateCamera("CAM-002", { direction: "EAST" });
  if (updated?.direction !== "EAST") throw new Error("Update direction failed");
  console.log(`✓ Updated CAM-002 direction: ${updated.direction}`);

  console.log("\n=== CAMERA MANAGEMENT TESTS PASSED (>= 3 CAMERAS REGISTERED) ===");
  await disconnectDB();
  process.exit(0);
}

testCameraManagement().catch(async (err) => {
  console.error("Camera management test failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
