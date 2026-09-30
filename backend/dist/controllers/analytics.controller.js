"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
class AnalyticsController {
    async getTrafficOverview(_req, res, next) {
        try {
            const overview = await analytics_service_1.analyticsService.getTrafficOverview();
            res.status(200).json({ success: true, data: overview });
        }
        catch (error) {
            next(error);
        }
    }
    async getCameraAnalytics(_req, res, next) {
        try {
            const cameraStats = await analytics_service_1.analyticsService.getCameraAnalytics();
            res.status(200).json({ success: true, count: cameraStats.length, data: cameraStats });
        }
        catch (error) {
            next(error);
        }
    }
    async getMovements(_req, res, next) {
        try {
            const movements = await analytics_service_1.analyticsService.getMovements();
            res.status(200).json({ success: true, count: movements.length, data: movements });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
