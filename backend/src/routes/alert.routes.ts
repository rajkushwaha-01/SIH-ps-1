import { Router } from "express";
import { alertController } from "../controllers/alert.controller";

const router = Router();

router.get("/", (req, res, next) => alertController.getAlerts(req, res, next));
router.post("/:id/resolve", (req, res, next) => alertController.resolveAlert(req, res, next));
router.get("/config/blacklist", (req, res) => alertController.getBlacklist(req, res));

export default router;
