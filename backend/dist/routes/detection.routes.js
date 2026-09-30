"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const detection_controller_1 = require("../controllers/detection.controller");
const router = (0, express_1.Router)();
router.get("/", (req, res, next) => detection_controller_1.detectionController.getDetections(req, res, next));
router.post("/", (req, res, next) => detection_controller_1.detectionController.ingestDetection(req, res, next));
router.post("/process/:cameraId", (req, res, next) => detection_controller_1.detectionController.processCameraVideo(req, res, next));
exports.default = router;
