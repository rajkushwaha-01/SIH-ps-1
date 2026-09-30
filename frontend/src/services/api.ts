const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

async function uploadFile<T>(endpoint: string, file: File): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Upload failed with status ${res.status}`);
    }
    return data;
  } catch (err: any) {
    console.error(`[API Upload Error] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request<{ status: string }>("/api/health"),

  // Cameras
  getCameras: () => request<{ success: boolean; count: number; data: any[] }>("/api/cameras"),
  getCamera: (cameraId: string) => request<{ success: boolean; data: any }>(`/api/cameras/${cameraId}`),
  getCameraDetections: (cameraId: string) => request<{ success: boolean; data: any[] }>(`/api/cameras/${cameraId}/detections`),
  processCameraVideo: (cameraId: string, frameSkip: number = 1) =>
    request<{ success: boolean; processedDetectionsCount: number; detections: any[] }>(
      `/api/cameras/${cameraId}/process?frameSkip=${frameSkip}`,
      { method: "POST" }
    ),
  seedDemoCameras: () => request<{ success: boolean; data: any[] }>("/api/cameras/seed/demo", { method: "POST" }),
  runMultiCameraSimulation: (plate: string = "MP0AA8123") =>
    request<{ success: boolean; path: string[]; detections: any[] }>("/api/cameras/simulation/run-all", {
      method: "POST",
      body: JSON.stringify({ plate }),
    }),

  // Detections
  getDetections: (params: { plate?: string; cameraId?: string; limit?: number; skip?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.plate) query.set("plate", params.plate);
    if (params.cameraId) query.set("cameraId", params.cameraId);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.skip) query.set("skip", String(params.skip));
    return request<{ success: boolean; detections: any[]; total: number; limit: number; skip: number }>(
      `/api/detections?${query.toString()}`
    );
  },

  // Vehicles & Trajectory
  getVehicles: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{ success: boolean; vehicles: any[]; total: number }>(`/api/vehicles${query}`);
  },
  getVehicle: (plate: string) => request<{ success: boolean; data: any }>(`/api/vehicles/${plate}`),
  getTrajectory: (plate: string) => request<{ success: boolean; data: any }>(`/api/vehicles/${plate}/trajectory`),

  // Analytics
  getTrafficAnalytics: () => request<{ success: boolean; data: any }>("/api/analytics/traffic"),
  getCameraAnalytics: () => request<{ success: boolean; count: number; data: any[] }>("/api/analytics/cameras"),
  getMovements: () => request<{ success: boolean; count: number; data: any[] }>("/api/analytics/movements"),

  // Alerts
  getAlerts: (status: "ALL" | "ACTIVE" | "RESOLVED" = "ALL") =>
    request<{ success: boolean; alerts: any[]; total: number; activeCount: number }>(`/api/alerts?status=${status}`),
  resolveAlert: (alertId: string) =>
    request<{ success: boolean; data: any }>(`/api/alerts/${alertId}/resolve`, { method: "POST" }),

  // Media Upload & Inference Pipeline
  uploadImage: (file: File) =>
    uploadFile<{
      success: boolean;
      imageUrl: string;
      detectionsCount: number;
      detections: any[];
      rawDetections: any[];
    }>("/api/process/image", file),

  uploadVideo: (file: File, frameSkip: number = 2) =>
    uploadFile<{
      success: boolean;
      videoUrl: string;
      detectionsCount: number;
      detections: any[];
      rawDetections: any[];
    }>(`/api/process/video?frameSkip=${frameSkip}`, file),

  liveInference: (imageBlobOrBase64: Blob | string) => {
    if (typeof imageBlobOrBase64 === "string") {
      return request<{
        success: boolean;
        detections: any[];
        rawDetections: any[];
      }>("/api/live/inference", {
        method: "POST",
        body: JSON.stringify({ image: imageBlobOrBase64 }),
      });
    } else {
      const formData = new FormData();
      formData.append("file", imageBlobOrBase64, "frame.jpg");
      return fetch(`${API_BASE}/api/live/inference`, {
        method: "POST",
        body: formData,
      }).then((r) => r.json());
    }
  },

  // Real-Time Events (SSE)
  createEventSource: () => new EventSource(`${API_BASE}/api/events`),
};
