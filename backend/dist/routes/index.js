"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const camera_routes_1 = __importDefault(require("./camera.routes"));
const detection_routes_1 = __importDefault(require("./detection.routes"));
const vehicle_routes_1 = __importDefault(require("./vehicle.routes"));
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const alert_routes_1 = __importDefault(require("./alert.routes"));
const sse_service_1 = require("../services/sse.service");
const upload_1 = require("../middleware/upload");
const detection_controller_1 = require("../controllers/detection.controller");
const apiRouter = (0, express_1.Router)();
// Server-Sent Events stream
apiRouter.get("/events", (req, res) => {
    sse_service_1.sseService.addClient(res);
});
// Media Processing Endpoints
apiRouter.post("/process/image", upload_1.upload.single("file"), (req, res, next) => detection_controller_1.detectionController.processImage(req, res, next));
apiRouter.post("/process/video", upload_1.upload.single("file"), (req, res, next) => detection_controller_1.detectionController.processVideo(req, res, next));
apiRouter.post("/live/inference", upload_1.upload.single("file"), (req, res, next) => detection_controller_1.detectionController.processLiveInference(req, res, next));
apiRouter.use("/cameras", camera_routes_1.default);
apiRouter.use("/detections", detection_routes_1.default);
apiRouter.use("/vehicles", vehicle_routes_1.default);
apiRouter.use("/analytics", analytics_routes_1.default);
apiRouter.use("/alerts", alert_routes_1.default);
exports.default = apiRouter;
