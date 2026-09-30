"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectionService = exports.DetectionService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const models_1 = require("../models");
const ml_service_1 = require("./ml.service");
const alert_service_1 = require("./alert.service");
const sse_service_1 = require("./sse.service");
class DetectionService {
    /**
     * Normalizes license plate string (uppercase, alphanumeric only)
     */
    normalizePlate(plate) {
        return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
    }
    /**
     * Ingests a single detection, attaches camera GIS coordinates,
     * stores to MongoDB, and updates vehicle aggregates.
     */
    async ingestDetection(params) {
        const normalizedPlate = this.normalizePlate(params.plate);
        if (!normalizedPlate || normalizedPlate.length < 4) {
            throw new Error(`Invalid license plate text: "${params.plate}"`);
        }
        let latitude = 23.2845;
        let longitude = 77.4125;
        let direction = "UNKNOWN";
        let effectiveCamId = params.cameraId || "UPLOAD";
        const camera = await models_1.Camera.findOne({ cameraId: params.cameraId });
        if (camera) {
            latitude = camera.latitude;
            longitude = camera.longitude;
            direction = camera.direction || "UNKNOWN";
            effectiveCamId = camera.cameraId;
        }
        const timestamp = params.timestamp ? new Date(params.timestamp) : new Date();
        // 1. Create and persist detection
        const detection = await models_1.Detection.create({
            plate: normalizedPlate,
            confidence: Number(params.confidence) || 0.85,
            trackId: Number(params.trackId) || 0,
            cameraId: effectiveCamId,
            timestamp,
            latitude,
            longitude,
            direction,
            vehicleType: params.vehicleType || "CAR",
            imagePath: params.imagePath,
            sourceType: params.sourceType || (camera ? "VIDEO_FILE" : "UPLOAD_IMAGE"),
        });
        // 2. Update Vehicle aggregate record
        await models_1.Vehicle.findOneAndUpdate({ plate: normalizedPlate }, {
            $setOnInsert: { firstSeen: timestamp },
            $set: { lastSeen: timestamp, lastCameraId: effectiveCamId },
            $inc: { totalDetections: 1 },
        }, { upsert: true, new: true });
        // 3. Evaluate Alert Engine Rules (Blacklist & Route Anomalies)
        try {
            await alert_service_1.alertService.evaluateDetection(detection);
        }
        catch (err) {
            console.error(`[Detection Pipeline] Alert evaluation error: ${err.message}`);
        }
        // 4. Broadcast live detection via SSE
        sse_service_1.sseService.broadcast("detection", detection);
        return detection;
    }
    /**
     * Automatically executes video inference for a camera using Python ML service
     * and creates persistent detections in MongoDB.
     */
    async processCameraVideo(cameraId, frameSkip = 1) {
        const camera = await models_1.Camera.findOne({ cameraId });
        if (!camera) {
            throw new Error(`Camera with ID "${cameraId}" not found.`);
        }
        if (!camera.videoSource) {
            throw new Error(`Camera "${cameraId}" has no configured videoSource.`);
        }
        // Resolve video path relative to project root
        let resolvedVideoPath = path_1.default.isAbsolute(camera.videoSource)
            ? camera.videoSource
            : path_1.default.resolve(process.cwd(), camera.videoSource);
        // If running inside backend/ directory, check relative to root
        if (!fs_1.default.existsSync(resolvedVideoPath)) {
            resolvedVideoPath = path_1.default.resolve(__dirname, "../../../", camera.videoSource);
        }
        if (!fs_1.default.existsSync(resolvedVideoPath)) {
            throw new Error(`Camera video source not found at: ${resolvedVideoPath}`);
        }
        console.log(`[Detection Pipeline] Processing video for camera ${cameraId}: ${resolvedVideoPath}`);
        sse_service_1.sseService.broadcast("camera_status", { cameraId, status: "PROCESSING", timestamp: new Date() });
        try {
            const mlResponse = await ml_service_1.mlService.processVideo(resolvedVideoPath, frameSkip);
            if (!mlResponse.success) {
                sse_service_1.sseService.broadcast("camera_status", { cameraId, status: "ERROR", error: mlResponse.error });
                throw new Error(mlResponse.error || "ML service failed during video processing");
            }
            const createdDetections = [];
            const now = new Date();
            for (const raw of mlResponse.detections) {
                const detection = await this.ingestDetection({
                    plate: raw.plate,
                    confidence: raw.confidence,
                    trackId: raw.trackId,
                    cameraId: camera.cameraId,
                    timestamp: now,
                });
                createdDetections.push(detection);
            }
            sse_service_1.sseService.broadcast("camera_status", {
                cameraId,
                status: "ONLINE",
                timestamp: new Date(),
                processedCount: createdDetections.length,
            });
            return {
                success: true,
                cameraId,
                processedDetectionsCount: createdDetections.length,
                detections: createdDetections,
            };
        }
        catch (err) {
            sse_service_1.sseService.broadcast("camera_status", { cameraId, status: "ERROR", error: err.message });
            throw err;
        }
    }
    /**
     * Retrieves list of detections with optional query filters and pagination
     */
    async getDetections(query) {
        const filter = {};
        if (query.plate) {
            filter.plate = this.normalizePlate(query.plate);
        }
        if (query.cameraId) {
            filter.cameraId = query.cameraId;
        }
        const limit = Math.min(Number(query.limit) || 50, 200);
        const skip = Number(query.skip) || 0;
        const [detections, total] = await Promise.all([
            models_1.Detection.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
            models_1.Detection.countDocuments(filter),
        ]);
        return { detections, total, limit, skip };
    }
    /**
     * Retrieves recent detections specifically for a camera
     */
    async getCameraDetections(cameraId, limit = 20) {
        return await models_1.Detection.find({ cameraId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }
    /**
     * Processes an uploaded image file via ML Service and persists valid detections
     */
    async processUploadedImage(filePath, publicUrl) {
        const mlResponse = await ml_service_1.mlService.processImage(filePath);
        if (!mlResponse.success) {
            throw new Error(mlResponse.error || "ML service image processing failed");
        }
        const createdDetections = [];
        const now = new Date();
        for (const raw of mlResponse.detections) {
            try {
                const detection = await this.ingestDetection({
                    plate: raw.plate,
                    confidence: raw.confidence,
                    trackId: raw.trackId || 1,
                    cameraId: "UPLOAD",
                    timestamp: now,
                    imagePath: publicUrl || filePath,
                    sourceType: "UPLOAD_IMAGE",
                });
                createdDetections.push(detection);
            }
            catch (e) {
                console.warn(`[Image Upload] Skipped invalid plate: ${raw.plate}`);
            }
        }
        return {
            success: true,
            detectionsCount: createdDetections.length,
            rawDetections: mlResponse.detections,
            detections: createdDetections,
        };
    }
    /**
     * Processes an uploaded video file via ML Service and persists valid detections
     */
    async processUploadedVideo(filePath, publicUrl, frameSkip = 2) {
        const mlResponse = await ml_service_1.mlService.processVideo(filePath, frameSkip);
        if (!mlResponse.success) {
            throw new Error(mlResponse.error || "ML service video processing failed");
        }
        const createdDetections = [];
        const now = new Date();
        for (const raw of mlResponse.detections) {
            try {
                const detection = await this.ingestDetection({
                    plate: raw.plate,
                    confidence: raw.confidence,
                    trackId: raw.trackId || 1,
                    cameraId: "UPLOAD",
                    timestamp: now,
                    imagePath: publicUrl || filePath,
                    sourceType: "UPLOAD_VIDEO",
                });
                createdDetections.push(detection);
            }
            catch (e) {
                console.warn(`[Video Upload] Skipped invalid plate: ${raw.plate}`);
            }
        }
        return {
            success: true,
            detectionsCount: createdDetections.length,
            rawDetections: mlResponse.detections,
            detections: createdDetections,
        };
    }
    /**
     * Processes a live webcam frame via ML Service and persists valid detections
     */
    async processLiveFrame(filePath) {
        const mlResponse = await ml_service_1.mlService.processImage(filePath);
        if (!mlResponse.success) {
            return { success: false, error: mlResponse.error, detections: [] };
        }
        const createdDetections = [];
        const now = new Date();
        for (const raw of mlResponse.detections) {
            try {
                const detection = await this.ingestDetection({
                    plate: raw.plate,
                    confidence: raw.confidence,
                    trackId: raw.trackId || 1,
                    cameraId: "CAM-WEBCAM",
                    timestamp: now,
                    sourceType: "WEBCAM",
                });
                createdDetections.push(detection);
            }
            catch (e) {
                // Skip invalid plate
            }
        }
        return {
            success: true,
            rawDetections: mlResponse.detections,
            detections: createdDetections,
        };
    }
}
exports.DetectionService = DetectionService;
exports.detectionService = new DetectionService();
