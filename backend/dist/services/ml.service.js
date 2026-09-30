"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlService = exports.MLService = void 0;
const config_1 = require("../config");
const promises_1 = __importDefault(require("fs/promises"));
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
            const formData = new FormData();
            const image = await promises_1.default.readFile(imagePath);
            formData.append("file", new Blob([image]), "image.jpg");
            const response = await fetch(`${this.baseUrl}/process/image`, {
                method: "POST",
                body: formData,
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
            const formData = new FormData();
            const video = await promises_1.default.readFile(videoPath);
            formData.append("file", new Blob([video]), videoPath.split(/[\\/]/).pop() || "video.mp4");
            const response = await fetch(url, {
                method: "POST",
                body: formData,
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
