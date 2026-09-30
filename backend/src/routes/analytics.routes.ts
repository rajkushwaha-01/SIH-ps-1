import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";

const router = Router();

router.get("/traffic", (req, res, next) => analyticsController.getTrafficOverview(req, res, next));
router.get("/cameras", (req, res, next) => analyticsController.getCameraAnalytics(req, res, next));
router.get("/movements", (req, res, next) => analyticsController.getMovements(req, res, next));

export default router;
