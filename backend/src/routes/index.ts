import { Router } from "express";
import cameraRoutes from "./camera.routes";
import detectionRoutes from "./detection.routes";
import vehicleRoutes from "./vehicle.routes";
import analyticsRoutes from "./analytics.routes";
import alertRoutes from "./alert.routes";
import { sseService } from "../services/sse.service";
import { upload } from "../middleware/upload";
import { detectionController } from "../controllers/detection.controller";

const apiRouter = Router();

// Server-Sent Events stream
apiRouter.get("/events", (req, res) => {
  sseService.addClient(res);
});

// Media Processing Endpoints
apiRouter.post("/process/image", upload.single("file"), (req, res, next) => detectionController.processImage(req, res, next));
apiRouter.post("/process/video", upload.single("file"), (req, res, next) => detectionController.processVideo(req, res, next));
apiRouter.post("/live/inference", upload.single("file"), (req, res, next) => detectionController.processLiveInference(req, res, next));

apiRouter.use("/cameras", cameraRoutes);
apiRouter.use("/detections", detectionRoutes);
apiRouter.use("/vehicles", vehicleRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/alerts", alertRoutes);

export default apiRouter;
