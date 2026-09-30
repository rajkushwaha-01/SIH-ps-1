"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vehicle_controller_1 = require("../controllers/vehicle.controller");
const router = (0, express_1.Router)();
router.get("/", (req, res, next) => vehicle_controller_1.vehicleController.listVehicles(req, res, next));
router.get("/:plate", (req, res, next) => vehicle_controller_1.vehicleController.getVehicleByPlate(req, res, next));
router.get("/:plate/trajectory", (req, res, next) => vehicle_controller_1.vehicleController.getVehicleTrajectory(req, res, next));
exports.default = router;
