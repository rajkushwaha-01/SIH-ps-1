import { connectDB, disconnectDB } from "../config/db";
import { Camera, Detection, Vehicle, Alert } from "../models";

async function runDatabaseTest() {
  console.log("=== Starting MongoDB CRUD Operations Test ===");
  try {
    await connectDB();
    console.log("✓ Connected to MongoDB");

    // Clean up any old test artifacts
    await Camera.deleteMany({ cameraId: { $regex: /^TEST-/ } });
    await Detection.deleteMany({ plate: "TEST99AA1234" });
    await Vehicle.deleteMany({ plate: "TEST99AA1234" });
    await Alert.deleteMany({ plate: "TEST99AA1234" });

    // 1. CAMERA CRUD
    console.log("\n1. Testing Camera Model...");
    const testCamera = await Camera.create({
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

    const foundCamera = await Camera.findOne({ cameraId: "TEST-CAM-001" });
    if (!foundCamera) throw new Error("Camera not found after creation");
    console.log("✓ Camera read:", foundCamera.name);

    await Camera.updateOne(
      { cameraId: "TEST-CAM-001" },
      { status: "OFFLINE" }
    );
    const updatedCamera = await Camera.findOne({ cameraId: "TEST-CAM-001" });
    if (updatedCamera?.status !== "OFFLINE") throw new Error("Camera update failed");
    console.log("✓ Camera updated: status =", updatedCamera.status);

    // 2. DETECTION CRUD
    console.log("\n2. Testing Detection Model...");
    const testDetection = await Detection.create({
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

    const foundDetection = await Detection.findOne({ plate: "TEST99AA1234" });
    if (!foundDetection) throw new Error("Detection not found");
    console.log("✓ Detection read with confidence:", foundDetection.confidence);

    // 3. VEHICLE CRUD
    console.log("\n3. Testing Vehicle Model...");
    const now = new Date();
    const testVehicle = await Vehicle.create({
      plate: "TEST99AA1234",
      firstSeen: now,
      lastSeen: now,
      totalDetections: 1,
      lastCameraId: "TEST-CAM-001",
    });
    console.log("✓ Vehicle record created:", testVehicle.plate);

    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { plate: "TEST99AA1234" },
      { $inc: { totalDetections: 1 }, lastSeen: new Date() },
      { new: true }
    );
    if (!updatedVehicle || updatedVehicle.totalDetections !== 2) {
      throw new Error("Vehicle update/increment failed");
    }
    console.log("✓ Vehicle updated: totalDetections =", updatedVehicle.totalDetections);

    // 4. ALERT CRUD
    console.log("\n4. Testing Alert Model...");
    const testAlert = await Alert.create({
      plate: "TEST99AA1234",
      type: "BLACKLIST_MATCH",
      cameraId: "TEST-CAM-001",
      timestamp: new Date(),
      description: "Test blacklist match alert",
      status: "ACTIVE",
    });
    console.log("✓ Alert created:", testAlert._id, testAlert.type);

    const resolvedAlert = await Alert.findByIdAndUpdate(
      testAlert._id,
      { status: "RESOLVED" },
      { new: true }
    );
    if (resolvedAlert?.status !== "RESOLVED") throw new Error("Alert resolution failed");
    console.log("✓ Alert updated: status =", resolvedAlert.status);

    // Clean up test data
    await Camera.deleteOne({ cameraId: "TEST-CAM-001" });
    await Detection.deleteOne({ _id: testDetection._id });
    await Vehicle.deleteOne({ plate: "TEST99AA1234" });
    await Alert.deleteOne({ _id: testAlert._id });
    console.log("\n✓ Test data cleaned up successfully");

    console.log("\n=== ALL MONGODB CRUD TESTS PASSED SUCCESSFULLY ===");
  } catch (err: any) {
    console.error("❌ MongoDB CRUD test failed:", err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runDatabaseTest();
