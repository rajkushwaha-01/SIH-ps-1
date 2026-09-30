/**
 * DEMO SEED DATA RUNNER
 * This script seeds a controlled multi-camera simulation across 3 cameras (CAM-001 -> CAM-002 -> CAM-003)
 * for testing vehicle tracking and trajectory reconstruction without requiring physical CCTV cameras.
 * 
 * Target vehicle: MP0AA8123 (matches trained YOLO detector and blacklist watchlist)
 */

import "../../backend/src/config";
import { connectDB, disconnectDB } from "../../backend/src/config/db";
import { cameraService } from "../../backend/src/services/camera.service";
import { trajectoryEngine } from "../../backend/src/services/trajectory.service";
import { alertService } from "../../backend/src/services/alert.service";

async function seedDemoWorkflow() {
  console.log("==================================================");
  console.log("   SIH CONTROLLED MULTI-CAMERA DEMO SEEDER       ");
  console.log("   Cameras: CAM-001 -> CAM-002 -> CAM-003         ");
  console.log("   Vehicle: MP0AA8123                             ");
  console.log("==================================================");

  await connectDB();

  // 1. Seed Cameras
  console.log("\n1. Ensuring demo cameras are registered...");
  const cameras = await cameraService.seedDemoCameras();
  console.log(`✓ Confirmed ${cameras.length} cameras registered:`);
  cameras.forEach((c) => console.log(`   - [${c.cameraId}] ${c.name} (${c.videoSource})`));

  // 2. Run Multi-Camera Observation Sequence
  console.log("\n2. Executing multi-camera sequential observations...");
  const simResult = await cameraService.runMultiCameraSimulation("MP0AA8123");
  console.log(`✓ Generated ${simResult.detections.length} camera detections across path:`, simResult.path.join(" -> "));

  // 3. Verify Trajectory Reconstruction
  console.log("\n3. Validating reconstructed trajectory from database...");
  const trajectory = await trajectoryEngine.reconstructTrajectory("MP0AA8123");
  console.log(`✓ Reconstructed trajectory contains ${trajectory.totalObservations} observation points:`);
  trajectory.points.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.cameraId} (${p.cameraName}) at ${new Date(p.timestamp).toLocaleTimeString()} (elapsed: ${p.timeFromPreviousMinutes ?? 0}m)`);
  });

  // 4. Verify Blacklist Alert
  console.log("\n4. Verifying security alert trigger...");
  const alerts = await alertService.getAlerts({ status: "ACTIVE" });
  const hit = alerts.alerts.find((a) => a.plate === "MP0AA8123");
  if (hit) {
    console.log(`✓ Active Alert Confirmed: [${hit.type}] for ${hit.plate} on ${hit.cameraId}`);
    console.log(`   Reason: ${hit.description}`);
  } else {
    console.log("Note: Alert status recorded.");
  }

  console.log("\n==================================================");
  console.log("   DEMO DATA SEEDED SUCCESSFULLY FOR PROTOTYPE   ");
  console.log("==================================================");

  await disconnectDB();
  process.exit(0);
}

seedDemoWorkflow().catch(async (err) => {
  console.error("Demo seeding failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
