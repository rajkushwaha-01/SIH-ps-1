"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectionController = exports.DetectionController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const detection_service_1 = require("../services/detection.service");
class DetectionController {
    async ingestDetection(req, res, next) {
        try {
            const { plate, confidence, trackId, cameraId, timestamp, vehicleType, imagePath } = req.body;
            if (!plate || !cameraId) {
                res.status(400).json({ success: false, error: "Missing required fields (plate, cameraId)." });
                return;
            }
            const detection = await detection_service_1.detectionService.ingestDetection({
                plate,
                confidence: Number(confidence) || 0.85,
                trackId: Number(trackId) || 0,
                cameraId,
                timestamp: timestamp ? new Date(timestamp) : undefined,
                vehicleType,
                imagePath,
            });
            res.status(201).json({ success: true, data: detection });
        }
        catch (error) {
            next(error);
        }
    }
    async getDetections(req, res, next) {
        try {
            const { plate, cameraId, limit, skip } = req.query;
            const result = await detection_service_1.detectionService.getDetections({
                plate: plate,
                cameraId: cameraId,
                limit: limit ? parseInt(limit, 10) : undefined,
                skip: skip ? parseInt(skip, 10) : undefined,
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async getCameraDetections(req, res, next) {
        try {
            const { cameraId } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
            const detections = await detection_service_1.detectionService.getCameraDetections(cameraId, limit);
            res.status(200).json({ success: true, count: detections.length, data: detections });
        }
        catch (error) {
            next(error);
        }
    }
    async processCameraVideo(req, res, next) {
        try {
            const { cameraId } = req.params;
            const frameSkip = req.query.frameSkip ? parseInt(req.query.frameSkip, 10) : 1;
            const result = await detection_service_1.detectionService.processCameraVideo(cameraId, frameSkip);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async processImage(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: "No image file provided." });
                return;
            }
            const publicUrl = `/data/uploads/${req.file.filename}`;
            const result = await detection_service_1.detectionService.processUploadedImage(req.file.path, publicUrl);
            res.status(200).json({
                success: true,
                imageUrl: publicUrl,
                detectionsCount: result.detectionsCount,
                detections: result.detections,
                rawDetections: result.rawDetections,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async processVideo(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: "No video file provided." });
                return;
            }
            const frameSkip = req.query.frameSkip ? parseInt(req.query.frameSkip, 10) : 2;
            const publicUrl = `/data/uploads/${req.file.filename}`;
            const result = await detection_service_1.detectionService.processUploadedVideo(req.file.path, publicUrl, frameSkip);
            res.status(200).json({
                success: true,
                videoUrl: publicUrl,
                detectionsCount: result.detectionsCount,
                detections: result.detections,
                rawDetections: result.rawDetections,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async processLiveInference(req, res, next) {
        try {
            let filePath = null;
            if (req.file) {
                filePath = req.file.path;
            }
            else if (req.body.image || req.body.frame) {
                // Base64 data URL
                const rawStr = req.body.image || req.body.frame;
                const base64Data = rawStr.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const uploadsDir = path_1.default.resolve(process.cwd(), "data/uploads");
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                filePath = path_1.default.join(uploadsDir, `live-frame-${Date.now()}.jpg`);
                fs_1.default.writeFileSync(filePath, buffer);
            }
            if (!filePath) {
                res.status(400).json({ success: false, error: "No frame image provided." });
                return;
            }
            const result = await detection_service_1.detectionService.processLiveFrame(filePath);
            // Clean up temporary frame after processing to prevent disk filling
            try {
                if (filePath && fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
            catch { }
            res.status(200).json({
                success: true,
                detections: result.detections,
                rawDetections: result.rawDetections,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DetectionController = DetectionController;
exports.detectionController = new DetectionController();
