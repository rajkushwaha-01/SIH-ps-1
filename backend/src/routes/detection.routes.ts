import { Router } from "express";
import { detectionController } from "../controllers/detection.controller";

const router = Router();

router.get("/", (req, res, next) => detectionController.getDetections(req, res, next));
router.post("/", (req, res, next) => detectionController.ingestDetection(req, res, next));
router.post("/process/:cameraId", (req, res, next) => detectionController.processCameraVideo(req, res, next));

export default router;
