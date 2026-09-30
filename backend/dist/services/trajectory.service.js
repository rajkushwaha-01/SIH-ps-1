"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trajectoryEngine = exports.TrajectoryEngine = void 0;
const models_1 = require("../models");
class TrajectoryEngine {
    /**
     * Normalizes plate query string
     */
    normalizePlate(plate) {
        return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
    }
    /**
     * Reconstructs chronological trajectory from discrete ANPR camera observations.
     * Explicitly avoids claiming continuous GPS tracking.
     */
    async reconstructTrajectory(plate) {
        const normalizedPlate = this.normalizePlate(plate);
        // 1. Fetch all detections for plate, strictly sorted chronologically
        const detections = await models_1.Detection.find({ plate: normalizedPlate })
            .sort({ timestamp: 1 })
            .lean();
        if (!detections || detections.length === 0) {
            return {
                plate: normalizedPlate,
                totalObservations: 0,
                trackingType: "CAMERA_OBSERVATION_POINTS",
                firstObserved: null,
                lastObserved: null,
                points: [],
            };
        }
        // 2. Fetch camera metadata to resolve names and exact GIS coordinates
        const cameraIds = Array.from(new Set(detections.map((d) => d.cameraId)));
        const cameras = await models_1.Camera.find({ cameraId: { $in: cameraIds } }).lean();
        const cameraMap = new Map();
        for (const c of cameras) {
            cameraMap.set(c.cameraId, {
                name: c.name,
                location: c.location,
                latitude: c.latitude,
                longitude: c.longitude,
                direction: c.direction,
            });
        }
        // 3. Remove rapid consecutive duplicate observations at same camera (within 15s window)
        const filteredPoints = [];
        for (const d of detections) {
            const camMeta = cameraMap.get(d.cameraId);
            const cameraName = camMeta?.name || d.cameraId;
            const location = camMeta?.location || "Traffic Intersection";
            const latitude = d.latitude || camMeta?.latitude || 0;
            const longitude = d.longitude || camMeta?.longitude || 0;
            const direction = d.direction || camMeta?.direction || "UNKNOWN";
            const timestamp = new Date(d.timestamp);
            const previous = filteredPoints[filteredPoints.length - 1];
            // If at same camera within 15 seconds, skip duplicate observation
            if (previous &&
                previous.cameraId === d.cameraId &&
                Math.abs(timestamp.getTime() - previous.timestamp.getTime()) < 15000) {
                continue;
            }
            let timeFromPreviousMinutes;
            if (previous) {
                const diffMs = timestamp.getTime() - previous.timestamp.getTime();
                timeFromPreviousMinutes = Math.max(0, Math.round((diffMs / (1000 * 60)) * 10) / 10);
            }
            filteredPoints.push({
                cameraId: d.cameraId,
                cameraName,
                location,
                timestamp,
                latitude,
                longitude,
                direction,
                confidence: d.confidence,
                timeFromPreviousMinutes,
            });
        }
        return {
            plate: normalizedPlate,
            totalObservations: filteredPoints.length,
            trackingType: "CAMERA_OBSERVATION_POINTS",
            firstObserved: filteredPoints[0]?.timestamp || null,
            lastObserved: filteredPoints[filteredPoints.length - 1]?.timestamp || null,
            points: filteredPoints,
        };
    }
}
exports.TrajectoryEngine = TrajectoryEngine;
exports.trajectoryEngine = new TrajectoryEngine();
