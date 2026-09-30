"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alert_controller_1 = require("../controllers/alert.controller");
const router = (0, express_1.Router)();
router.get("/", (req, res, next) => alert_controller_1.alertController.getAlerts(req, res, next));
router.post("/:id/resolve", (req, res, next) => alert_controller_1.alertController.resolveAlert(req, res, next));
router.get("/config/blacklist", (req, res) => alert_controller_1.alertController.getBlacklist(req, res));
exports.default = router;
