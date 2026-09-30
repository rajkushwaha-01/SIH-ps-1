"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const ml_service_1 = require("../services/ml.service");
async function testMLIntegration() {
    console.log("=== Testing Node.js -> Python ML Service Integration ===");
    // 1. Health check
    console.log("1. Checking ML Service Health from Node.js...");
    const health = await ml_service_1.mlService.healthCheck();
    console.log("ML Health Response:", health);
    if (!health.ok) {
        throw new Error("Python ML Service is not healthy or unreachable!");
    }
    console.log("✓ Health check succeeded");
    // 2. Process Image
    const imagePath = path_1.default.resolve(__dirname, "../../../data/demo/test_car_plate.jpg");
    console.log(`\n2. Sending Image to ML Service from Node.js:\n  Path: ${imagePath}`);
    const imgResult = await ml_service_1.mlService.processImage(imagePath);
    console.log("Node received Image Result:", JSON.stringify(imgResult, null, 2));
    if (!imgResult.success || !imgResult.detections || imgResult.detections.length === 0) {
        throw new Error("Failed to receive valid detections from image inference!");
    }
    console.log(`✓ Image inference succeeded: Detected ${imgResult.detections[0].plate} (Conf: ${imgResult.detections[0].confidence})`);
    // 3. Process Video
    const videoPath = path_1.default.resolve(__dirname, "../../../data/videos/cam_001.mp4");
    console.log(`\n3. Sending Video to ML Service from Node.js:\n  Path: ${videoPath}`);
    const vidResult = await ml_service_1.mlService.processVideo(videoPath, 1);
    console.log("Node received Video Result:", JSON.stringify(vidResult, null, 2));
    if (!vidResult.success || !vidResult.detections || vidResult.detections.length === 0) {
        throw new Error("Failed to receive valid detections from video inference!");
    }
    console.log(`✓ Video inference succeeded: Detected ${vidResult.detections[0].plate} on Track ID ${vidResult.detections[0].trackId}`);
    // 4. Graceful Error Handling test
    console.log("\n4. Testing Graceful Error Handling with non-existent file...");
    const errResult = await ml_service_1.mlService.processImage("non_existent_file.jpg");
    console.log("Handled Gracefully:", errResult.success === false, "| Error:", errResult.error);
    if (errResult.success) {
        throw new Error("Expected failure for non-existent file!");
    }
    console.log("✓ Graceful error handling validated");
    console.log("\n=== ALL NODE.JS <-> PYTHON INTEGRATION TESTS PASSED ===");
}
testMLIntegration().catch((err) => {
    console.error("Integration test failed:", err.message);
    process.exit(1);
});
