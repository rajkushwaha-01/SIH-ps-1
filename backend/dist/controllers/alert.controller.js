"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertController = exports.AlertController = void 0;
const alert_service_1 = require("../services/alert.service");
class AlertController {
    async getAlerts(req, res, next) {
        try {
            const { status, limit, skip } = req.query;
            const result = await alert_service_1.alertService.getAlerts({
                status: status,
                limit: limit ? parseInt(limit, 10) : undefined,
                skip: skip ? parseInt(skip, 10) : undefined,
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async resolveAlert(req, res, next) {
        try {
            const { id } = req.params;
            const alert = await alert_service_1.alertService.resolveAlert(id);
            if (!alert) {
                res.status(404).json({ success: false, error: `Alert with ID ${id} not found.` });
                return;
            }
            res.status(200).json({
                success: true,
                message: "Alert resolved successfully.",
                data: alert,
            });
        }
        catch (error) {
            next(error);
        }
    }
    getBlacklist(_req, res) {
        const list = alert_service_1.alertService.getBlacklist();
        res.status(200).json({ success: true, count: list.length, data: list });
    }
}
exports.AlertController = AlertController;
exports.alertController = new AlertController();
