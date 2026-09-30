import { Router } from "express";
import { cameraController } from "../controllers/camera.controller";
import { detectionController } from "../controllers/detection.controller";

const router = Router();

router.get("/", (req, res, next) => cameraController.getAllCameras(req, res, next));
router.get("/:cameraId", (req, res, next) => cameraController.getCameraById(req, res, next));
router.get("/:cameraId/detections", (req, res, next) => detectionController.getCameraDetections(req, res, next));
router.post("/:cameraId/process", (req, res, next) => detectionController.processCameraVideo(req, res, next));
router.post("/", (req, res, next) => cameraController.createCamera(req, res, next));
router.put("/:cameraId", (req, res, next) => cameraController.updateCamera(req, res, next));
router.delete("/:cameraId", (req, res, next) => cameraController.deleteCamera(req, res, next));
router.post("/seed/demo", (req, res, next) => cameraController.seedCameras(req, res, next));
router.post("/simulation/run-all", (req, res, next) => cameraController.runSimulation(req, res, next));

export default router;
