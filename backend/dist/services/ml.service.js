"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlService = exports.MLService = void 0;
const config_1 = require("../config");
class MLService {
    baseUrl;
    constructor() {
        this.baseUrl = config_1.config.mlServiceUrl.replace(/\/$/, "");
    }
    /**
     * Health check ping to Python ML service
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) {
                return { ok: false, status: `HTTP ${response.status}` };
            }
            const data = await response.json();
            return { ok: true, status: data.status, details: data };
        }
        catch (err) {
            console.error(`[ML Service Error] Health check failed: ${err.message}`);
            return { ok: false, status: "ML service unavailable" };
        }
    }
    /**
     * Process a single image through Python ML service
     */
    async processImage(imagePath) {
        try {
            const response = await fetch(`${this.baseUrl}/process/image`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imagePath }),
                signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    detections: [],
                    error: `ML Service returned error ${response.status}: ${errorText}`,
                };
            }
            const result = (await response.json());
            return result;
        }
        catch (err) {
            console.error(`[ML Service Error] processImage failed: ${err.message}`);
            return {
                success: false,
                detections: [],
                error: "ML service unavailable or image inference timed out.",
            };
        }
    }
    /**
     * Process a video file through Python ML service
     */
    async processVideo(videoPath, frameSkip = 1) {
        try {
            const url = `${this.baseUrl}/process/video?frame_skip=${frameSkip}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoPath }),
                signal: AbortSignal.timeout(60000),
            });
            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    detections: [],
                    error: `ML Service returned error ${response.status}: ${errorText}`,
                };
            }
            const result = (await response.json());
            return result;
        }
        catch (err) {
            console.error(`[ML Service Error] processVideo failed: ${err.message}`);
            return {
                success: false,
                detections: [],
                error: "ML service unavailable or video inference timed out.",
            };
        }
    }
}
exports.MLService = MLService;
exports.mlService = new MLService();
