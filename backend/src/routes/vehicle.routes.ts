import { Router } from "express";
import { vehicleController } from "../controllers/vehicle.controller";

const router = Router();

router.get("/", (req, res, next) => vehicleController.listVehicles(req, res, next));
router.get("/:plate", (req, res, next) => vehicleController.getVehicleByPlate(req, res, next));
router.get("/:plate/trajectory", (req, res, next) => vehicleController.getVehicleTrajectory(req, res, next));

export default router;
