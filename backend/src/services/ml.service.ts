import { config } from "../config";
import fs from "fs/promises";

export interface MLRawDetection {
  plate: string;
  confidence: number;
  trackId: number;
  bbox?: [number, number, number, number];
}

export interface MLDetectionResponse {
  success: boolean;
  detections: MLRawDetection[];
  error?: string;
}

export class MLService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mlServiceUrl.replace(/\/$/, "");
  }

  /**
   * Health check ping to Python ML service
   */
  async healthCheck(): Promise<{ ok: boolean; status?: string; details?: any }> {
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
    } catch (err: any) {
      console.error(`[ML Service Error] Health check failed: ${err.message}`);
      return { ok: false, status: "ML service unavailable" };
    }
  }

  /**
   * Process a single image through Python ML service
   */
  async processImage(imagePath: string): Promise<MLDetectionResponse> {
    try {
      const formData = new FormData();
      const image = await fs.readFile(imagePath);
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

      const result = (await response.json()) as MLDetectionResponse;
      return result;
    } catch (err: any) {
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
  async processVideo(videoPath: string, frameSkip: number = 1): Promise<MLDetectionResponse> {
    try {
      const url = `${this.baseUrl}/process/video?frame_skip=${frameSkip}`;
      const formData = new FormData();
      const video = await fs.readFile(videoPath);
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

      const result = (await response.json()) as MLDetectionResponse;
      return result;
    } catch (err: any) {
      console.error(`[ML Service Error] processVideo failed: ${err.message}`);
      return {
        success: false,
        detections: [],
        error: "ML service unavailable or video inference timed out.",
      };
    }
  }
}

export const mlService = new MLService();
