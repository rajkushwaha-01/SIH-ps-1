"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertService = exports.AlertService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const models_1 = require("../models");
const sse_service_1 = require("./sse.service");
class AlertService {
    blacklistPath;
    constructor() {
        this.blacklistPath = path_1.default.resolve(__dirname, "../../../data/blacklist/blacklist.json");
        if (!fs_1.default.existsSync(this.blacklistPath)) {
            this.blacklistPath = path_1.default.resolve(process.cwd(), "data/blacklist/blacklist.json");
        }
    }
    /**
     * Reads configured blacklist entries from disk
     */
    getBlacklist() {
        try {
            if (fs_1.default.existsSync(this.blacklistPath)) {
                const raw = fs_1.default.readFileSync(this.blacklistPath, "utf-8");
                return JSON.parse(raw);
            }
        }
        catch (err) {
            console.error(`[Alert Engine] Failed to read blacklist: ${err.message}`);
        }
        return [];
    }
    /**
     * Evaluates incoming detection against blacklist and deterministic trajectory anomaly rules.
     */
    async evaluateDetection(detection) {
        const normalizedPlate = detection.plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
        // 1. Blacklist Rule Evaluation
        const blacklist = this.getBlacklist();
        const match = blacklist.find((b) => b.plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim() === normalizedPlate);
        if (match) {
            // Prevent duplicate active alerts for the same plate and camera within a 2-minute window
            const twoMinutesAgo = new Date(new Date(detection.timestamp).getTime() - 2 * 60 * 1000);
            const existingActive = await models_1.Alert.findOne({
                plate: normalizedPlate,
                cameraId: detection.cameraId,
                status: "ACTIVE",
                timestamp: { $gte: twoMinutesAgo },
            });
            if (!existingActive) {
                console.log(`[Alert Engine] MATCH TRIGGERED: Plate ${normalizedPlate} on camera ${detection.cameraId}!`);
                const alert = await models_1.Alert.create({
                    plate: normalizedPlate,
                    type: "BLACKLIST_MATCH",
                    cameraId: detection.cameraId,
                    timestamp: detection.timestamp,
                    description: `Blacklisted vehicle identified: ${match.reason} [${match.category}]`,
                    status: "ACTIVE",
                });
                sse_service_1.sseService.broadcast("alert", alert);
                return alert;
            }
        }
        // 2. Deterministic Route Anomaly Evaluation (only if multi-camera trajectory data exists)
        // Checks for physically impossible transit speeds (> 160 km/h) between camera sites
        try {
            const priorDetection = await detection.constructor
                .findOne({
                plate: normalizedPlate,
                cameraId: { $ne: detection.cameraId },
                timestamp: { $lt: detection.timestamp },
            })
                .sort({ timestamp: -1 })
                .lean();
            if (priorDetection) {
                const timeDiffHours = (new Date(detection.timestamp).getTime() - new Date(priorDetection.timestamp).getTime()) /
                    (1000 * 60 * 60);
                // Approximate geographic distance in km (Haversine formula)
                const dLat = ((detection.latitude - priorDetection.latitude) * Math.PI) / 180;
                const dLon = ((detection.longitude - priorDetection.longitude) * Math.PI) / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((priorDetection.latitude * Math.PI) / 180) *
                        Math.cos((detection.latitude * Math.PI) / 180) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceKm = 6371 * c;
                // If distance > 1km and speed > 160 km/h, flag physically implausible jump (e.g. cloned plates)
                if (distanceKm > 1.0 && timeDiffHours > 0) {
                    const impliedSpeed = distanceKm / timeDiffHours;
                    if (impliedSpeed > 160) {
                        const anomalyAlert = await models_1.Alert.create({
                            plate: normalizedPlate,
                            type: "ROUTE_ANOMALY",
                            cameraId: detection.cameraId,
                            timestamp: detection.timestamp,
                            description: `Route anomaly: Physically implausible transit speed (${Math.round(impliedSpeed)} km/h across ${distanceKm.toFixed(1)} km) between ${priorDetection.cameraId} and ${detection.cameraId}. Possible cloned license plate.`,
                            status: "ACTIVE",
                        });
                        sse_service_1.sseService.broadcast("alert", anomalyAlert);
                        return anomalyAlert;
                    }
                }
            }
        }
        catch (err) {
            console.error(`[Alert Engine] Route anomaly evaluation error: ${err.message}`);
        }
        return null;
    }
    /**
     * Retrieves alerts with optional status filtering and pagination
     */
    async getAlerts(query) {
        const filter = {};
        if (query.status && query.status !== "ALL") {
            filter.status = query.status.toUpperCase();
        }
        const limit = Math.min(Number(query.limit) || 50, 200);
        const skip = Number(query.skip) || 0;
        const [alerts, total, activeCount] = await Promise.all([
            models_1.Alert.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
            models_1.Alert.countDocuments(filter),
            models_1.Alert.countDocuments({ status: "ACTIVE" }),
        ]);
        // Attach camera name to each alert for UI convenience
        const cameraIds = Array.from(new Set(alerts.map((a) => a.cameraId)));
        const cameras = await models_1.Camera.find({ cameraId: { $in: cameraIds } }).lean();
        const camMap = new Map();
        cameras.forEach((c) => camMap.set(c.cameraId, c.name));
        const enrichedAlerts = alerts.map((a) => ({
            ...a,
            cameraName: camMap.get(a.cameraId) || a.cameraId,
        }));
        return { alerts: enrichedAlerts, total, activeCount, limit, skip };
    }
    /**
     * Resolves an active alert
     */
    async resolveAlert(alertId) {
        const alert = await models_1.Alert.findByIdAndUpdate(alertId, { $set: { status: "RESOLVED" } }, { new: true });
        return alert;
    }
}
exports.AlertService = AlertService;
exports.alertService = new AlertService();
