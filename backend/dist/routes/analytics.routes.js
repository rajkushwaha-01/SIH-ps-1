"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
router.get("/traffic", (req, res, next) => analytics_controller_1.analyticsController.getTrafficOverview(req, res, next));
router.get("/cameras", (req, res, next) => analytics_controller_1.analyticsController.getCameraAnalytics(req, res, next));
router.get("/movements", (req, res, next) => analytics_controller_1.analyticsController.getMovements(req, res, next));
exports.default = router;
