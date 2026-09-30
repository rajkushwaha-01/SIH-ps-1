"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraService = exports.CameraService = void 0;
const models_1 = require("../models");
class CameraService {
    async getAllCameras() {
        const cameras = await models_1.Camera.find().sort({ cameraId: 1 }).lean();
        // Aggregate detection count per camera
        const detectionCounts = await models_1.Detection.aggregate([
            { $group: { _id: "$cameraId", count: { $sum: 1 } } },
        ]);
        const countMap = new Map();
        for (const item of detectionCounts) {
            countMap.set(item._id, item.count);
        }
        return cameras.map((cam) => ({
            cameraId: cam.cameraId,
            name: cam.name,
            location: cam.location,
            latitude: cam.latitude,
            longitude: cam.longitude,
            direction: cam.direction,
            status: cam.status,
            sourceType: cam.sourceType,
            videoSource: cam.videoSource,
            createdAt: cam.createdAt,
            detectionCount: countMap.get(cam.cameraId) || 0,
        }));
    }
    async getCameraById(cameraId) {
        const camera = await models_1.Camera.findOne({ cameraId }).lean();
        if (!camera) {
            return null;
        }
        const recentDetections = await models_1.Detection.find({ cameraId })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
        const totalDetections = await models_1.Detection.countDocuments({ cameraId });
        return {
            ...camera,
            detectionCount: totalDetections,
            recentDetections,
        };
    }
    async createCamera(cameraData) {
        const existing = await models_1.Camera.findOne({ cameraId: cameraData.cameraId });
        if (existing) {
            throw new Error(`Camera with ID ${cameraData.cameraId} already exists.`);
        }
        const camera = new models_1.Camera(cameraData);
        return await camera.save();
    }
    async updateCamera(cameraId, updateData) {
        const camera = await models_1.Camera.findOneAndUpdate({ cameraId }, { $set: updateData }, { new: true, runValidators: true });
        return camera;
    }
    async deleteCamera(cameraId) {
        const result = await models_1.Camera.deleteOne({ cameraId });
        return result.deletedCount > 0;
    }
    async seedDemoCameras() {
        const demoCameras = [
            {
                cameraId: "CAM-001",
                name: "Airport Road Junction",
                location: "VIP Corridor North",
                latitude: 23.2845,
                longitude: 77.4125,
                direction: "NORTH",
                status: "ONLINE",
                sourceType: "VIDEO_FILE",
                videoSource: "data/videos/cam_001.mp4",
            },
            {
                cameraId: "CAM-002",
                name: "VIP Road Overpass",
                location: "Expressway Connector East",
                latitude: 23.2680,
                longitude: 77.3990,
                direction: "EAST",
                status: "ONLINE",
                sourceType: "VIDEO_FILE",
                videoSource: "data/videos/cam_002.mp4",
            },
            {
                cameraId: "CAM-003",
                name: "Ring Road Interchange",
                location: "Outer Bypass South",
                latitude: 23.2450,
                longitude: 77.4320,
                direction: "SOUTH",
                status: "ONLINE",
                sourceType: "VIDEO_FILE",
                videoSource: "data/videos/cam_003.mp4",
            },
        ];
        const results = [];
        for (const demo of demoCameras) {
            const existing = await models_1.Camera.findOne({ cameraId: demo.cameraId });
            if (!existing) {
                const created = await models_1.Camera.create(demo);
                results.push(created);
            }
            else {
                const updated = await models_1.Camera.findOneAndUpdate({ cameraId: demo.cameraId }, { $set: demo }, { new: true });
                if (updated)
                    results.push(updated);
            }
        }
        return results;
    }
    async runMultiCameraSimulation(plate = "MP0AA8123") {
        await this.seedDemoCameras();
        const { detectionService } = await Promise.resolve().then(() => __importStar(require("./detection.service")));
        const now = new Date();
        const timeline = [
            { cameraId: "CAM-001", offsetMinutes: 24, trackId: 1, confidence: 0.96 },
            { cameraId: "CAM-002", offsetMinutes: 12, trackId: 4, confidence: 0.94 },
            { cameraId: "CAM-003", offsetMinutes: 0, trackId: 8, confidence: 0.97 },
        ];
        const detections = [];
        for (const step of timeline) {
            const timestamp = new Date(now.getTime() - step.offsetMinutes * 60 * 1000);
            const det = await detectionService.ingestDetection({
                plate,
                confidence: step.confidence,
                trackId: step.trackId,
                cameraId: step.cameraId,
                timestamp,
            });
            detections.push(det);
        }
        return {
            success: true,
            message: "Multi-camera trajectory simulation completed successfully.",
            plate,
            path: ["CAM-001", "CAM-002", "CAM-003"],
            detections,
        };
    }
}
exports.CameraService = CameraService;
exports.cameraService = new CameraService();
