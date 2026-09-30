"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraController = exports.CameraController = void 0;
const camera_service_1 = require("../services/camera.service");
class CameraController {
    async getAllCameras(_req, res, next) {
        try {
            const cameras = await camera_service_1.cameraService.getAllCameras();
            res.status(200).json({ success: true, count: cameras.length, data: cameras });
        }
        catch (error) {
            next(error);
        }
    }
    async getCameraById(req, res, next) {
        try {
            const { cameraId } = req.params;
            const camera = await camera_service_1.cameraService.getCameraById(cameraId);
            if (!camera) {
                res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
                return;
            }
            res.status(200).json({ success: true, data: camera });
        }
        catch (error) {
            next(error);
        }
    }
    async createCamera(req, res, next) {
        try {
            const { cameraId, name, location, latitude, longitude, direction, status, sourceType, videoSource } = req.body;
            if (!cameraId || !name || !location || latitude === undefined || longitude === undefined) {
                res.status(400).json({
                    success: false,
                    error: "Missing required camera fields (cameraId, name, location, latitude, longitude).",
                });
                return;
            }
            const camera = await camera_service_1.cameraService.createCamera({
                cameraId,
                name,
                location,
                latitude: Number(latitude),
                longitude: Number(longitude),
                direction: direction || "NORTH",
                status: status || "ONLINE",
                sourceType: sourceType || "SIMULATED_VIDEO",
                videoSource,
            });
            res.status(201).json({ success: true, data: camera });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCamera(req, res, next) {
        try {
            const { cameraId } = req.params;
            const updated = await camera_service_1.cameraService.updateCamera(cameraId, req.body);
            if (!updated) {
                res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
                return;
            }
            res.status(200).json({ success: true, data: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCamera(req, res, next) {
        try {
            const { cameraId } = req.params;
            const deleted = await camera_service_1.cameraService.deleteCamera(cameraId);
            if (!deleted) {
                res.status(404).json({ success: false, error: `Camera with ID ${cameraId} not found.` });
                return;
            }
            res.status(200).json({ success: true, message: `Camera ${cameraId} deleted successfully.` });
        }
        catch (error) {
            next(error);
        }
    }
    async seedCameras(_req, res, next) {
        try {
            const cameras = await camera_service_1.cameraService.seedDemoCameras();
            res.status(200).json({ success: true, message: "Demo cameras seeded successfully.", data: cameras });
        }
        catch (error) {
            next(error);
        }
    }
    async runSimulation(req, res, next) {
        try {
            const plate = req.body?.plate || "MP0AA8123";
            const result = await camera_service_1.cameraService.runMultiCameraSimulation(plate);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CameraController = CameraController;
exports.cameraController = new CameraController();
