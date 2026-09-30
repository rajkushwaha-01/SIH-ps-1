import { connectDB, disconnectDB } from "../config/db";
import { alertService } from "../services/alert.service";
import { detectionService } from "../services/detection.service";
import { Alert } from "../models";

async function testAlertEngine() {
  console.log("=== Testing Alert Engine (Blacklist & Resolution) ===");
  await connectDB();

  // 1. Check blacklist loading
  console.log("1. Reading configurable blacklist data...");
  const blacklist = alertService.getBlacklist();
  console.log(`✓ Loaded ${blacklist.length} blacklist entries:`, blacklist.map((b) => b.plate));

  if (blacklist.length === 0) {
    throw new Error("Blacklist data is empty!");
  }

  const targetBlacklistPlate = blacklist[0].plate; // "MP0AA8123"

  // Clean old alerts for target plate
  await Alert.deleteMany({ plate: targetBlacklistPlate });

  // 2. Ingest detection for blacklisted plate
  console.log(`\n2. Ingesting detection for blacklisted plate "${targetBlacklistPlate}"...`);
  const detection = await detectionService.ingestDetection({
    plate: targetBlacklistPlate,
    confidence: 0.98,
    trackId: 10,
    cameraId: "CAM-001",
    timestamp: new Date(),
  });
  console.log("✓ Ingested detection ID:", detection._id);

  // 3. Query active alerts
  console.log("\n3. Verifying BLACKLIST_MATCH alert creation in database...");
  const alertsResponse = await alertService.getAlerts({ status: "ACTIVE" });
  console.log("Active Alerts Count:", alertsResponse.activeCount);

  const matchedAlert = alertsResponse.alerts.find((a) => a.plate === targetBlacklistPlate);
  if (!matchedAlert) {
    throw new Error(`Expected active alert for ${targetBlacklistPlate}, but none was found!`);
  }

  console.log("Found Alert:");
  console.log(` - ID: ${matchedAlert._id}`);
  console.log(` - Plate: ${matchedAlert.plate}`);
  console.log(` - Type: ${matchedAlert.type}`);
  console.log(` - Camera: ${matchedAlert.cameraId} (${matchedAlert.cameraName})`);
  console.log(` - Status: ${matchedAlert.status}`);
  console.log(` - Description: ${matchedAlert.description}`);

  if (matchedAlert.type !== "BLACKLIST_MATCH") {
    throw new Error(`Expected alert type BLACKLIST_MATCH, got ${matchedAlert.type}`);
  }
  if (matchedAlert.status !== "ACTIVE") {
    throw new Error(`Expected alert status ACTIVE, got ${matchedAlert.status}`);
  }

  // 4. Test resolving the alert
  console.log(`\n4. Testing alert resolution for alert ID: ${matchedAlert._id}...`);
  const resolved = await alertService.resolveAlert(String(matchedAlert._id));
  if (!resolved || resolved.status !== "RESOLVED") {
    throw new Error("Failed to resolve alert!");
  }
  console.log(`✓ Alert status updated to: ${resolved.status}`);

  // Verify active count decreased
  const afterResolve = await alertService.getAlerts({ status: "ACTIVE" });
  const stillActive = afterResolve.alerts.find((a) => String(a._id) === String(matchedAlert._id));
  if (stillActive) {
    throw new Error("Resolved alert still appears in ACTIVE list!");
  }
  console.log("✓ Confirmed alert removed from active queue");

  console.log("\n=== ALL ALERT ENGINE TESTS PASSED SUCCESSFULLY ===");
  await disconnectDB();
  process.exit(0);
}

testAlertEngine().catch(async (err) => {
  console.error("Alert engine test failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
