import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

interface CameraItem {
  cameraId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  direction: string;
  status: "ONLINE" | "OFFLINE";
  sourceType: string;
  videoSource?: string;
  detectionCount: number;
}

export const CamerasPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryCameraId = searchParams.get("cameraId");

  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<any | null>(null);
  const [cameraDetections, setCameraDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [inferenceStatus, setInferenceStatus] = useState<string | null>(null);

  const resolveVideoUrl = (source?: string): string | null => {
    if (!source) return null;
    if (source.startsWith("http://") || source.startsWith("https://")) return source;
    const cleanPath = source.replace(/\\/g, "/").replace(/^\//, "");
    return `${API_BASE}/${cleanPath}`;
  };

  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCameras();
      if (res.success) {
        setCameras(res.data);
        if (res.data.length > 0) {
          const targetCam = queryCameraId && res.data.some((c: any) => c.cameraId === queryCameraId)
            ? queryCameraId
            : res.data[0].cameraId;
          selectCamera(targetCam);
        }
      }
    } catch (err: any) {
      console.error("Failed to load cameras:", err.message);
    } finally {
      setLoading(false);
    }
  }, [queryCameraId]);

  const selectCamera = async (cameraId: string) => {
    try {
      const [camRes, detsRes] = await Promise.all([
        api.getCamera(cameraId),
        api.getCameraDetections(cameraId),
      ]);

      if (camRes.success) {
        setSelectedCamera(camRes.data);
      }
      if (detsRes.success) {
        setCameraDetections(detsRes.data);
      }
    } catch (err: any) {
      console.error(`Failed to load details for ${cameraId}:`, err.message);
    }
  };

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const handleRunInference = async (cameraId: string) => {
    try {
      setProcessing(true);
      setInferenceStatus("Running YOLO detection & ByteTrack on video source...");
      const res = await api.processCameraVideo(cameraId, 1);
      if (res.success) {
        setInferenceStatus(`Completed: ${res.processedDetectionsCount} ANPR observation(s) recorded.`);
        await selectCamera(cameraId);
        await loadCameras();
      }
    } catch (err: any) {
      setInferenceStatus(`Inference failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSeedCameras = async () => {
    try {
      setLoading(true);
      await api.seedDemoCameras();
      await loadCameras();
    } catch (err: any) {
      alert(`Failed to seed demo cameras: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Header bar */}
      <div className="op-page-header">
        <div>
          <h2 className="op-page-title">
            Camera Registry & Sensor Management
          </h2>
          <div className="op-page-subtitle">
            Sensor status, video previews, coordinates, and localized ANPR observations
          </div>
        </div>

        {cameras.length === 0 && (
          <button className="op-btn primary" onClick={handleSeedCameras}>
            Register 3 Demo Cameras
          </button>
        )}
      </div>

      {/* Main 2-column view */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", alignItems: "start" }}>
        {/* Left: Camera List Table */}
        <div className="op-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="op-card-title">Installed Camera Sites ({cameras.length})</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Select a camera to view feed & details</span>
          </div>

          {cameras.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
              {loading ? "Loading camera inventory..." : "No cameras registered in system."}
            </div>
          ) : (
            <table className="op-table">
              <thead>
                <tr>
                  <th>Camera ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Detections</th>
                </tr>
              </thead>
              <tbody>
                {cameras.map((c) => {
                  const isSelected = selectedCamera?.cameraId === c.cameraId;
                  return (
                    <tr
                      key={c.cameraId}
                      onClick={() => selectCamera(c.cameraId)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "var(--accent-light)" : undefined,
                      }}
                    >
                      <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                        {c.cameraId}
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ color: "var(--text-muted)" }}>{c.location}</td>
                      <td style={{ color: "var(--text-main)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        {c.direction}
                      </td>
                      <td>
                        <span className={`op-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{c.detectionCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Selected Camera Details */}
        <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {selectedCamera ? (
            <>
              {/* Camera Header */}
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    {selectedCamera.cameraId}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className="op-badge source-file">
                      {selectedCamera.sourceType === "VIDEO_FILE" || selectedCamera.sourceType === "SIMULATED_VIDEO" ? "VIDEO FILE" : selectedCamera.sourceType}
                    </span>
                    <span className={`op-badge ${selectedCamera.status.toLowerCase()}`}>{selectedCamera.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "4px" }}>
                  {selectedCamera.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedCamera.location}</div>
              </div>

              {/* REAL VIDEO PREVIEW */}
              {selectedCamera.videoSource && resolveVideoUrl(selectedCamera.videoSource) ? (
                <div style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-color)", background: "#000000" }}>
                  <video
                    key={selectedCamera.videoSource}
                    src={resolveVideoUrl(selectedCamera.videoSource) || ""}
                    controls
                    muted
                    playsInline
                    autoPlay
                    loop
                    style={{
                      width: "100%",
                      maxHeight: "240px",
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : selectedCamera.sourceType === "WEBCAM" ? (
                <div style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "var(--bg-card-alt)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                }}>
                  Webcam source configured. Switch to Live Camera tab to stream.
                </div>
              ) : selectedCamera.sourceType === "IP_CAMERA" ? (
                <div style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "var(--bg-card-alt)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                }}>
                  Stream unavailable (IP Camera RTSP not connected)
                </div>
              ) : (
                <div style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "var(--bg-card-alt)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                }}>
                  Video source unavailable
                </div>
              )}

              {/* Coordinates and Hardware Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--bg-card-alt)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Coordinates</div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px", fontWeight: 600 }}>
                    {selectedCamera.latitude.toFixed(4)}, {selectedCamera.longitude.toFixed(4)}
                  </div>
                </div>

                <div style={{ background: "var(--bg-card-alt)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Facing Direction</div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px", fontWeight: 600 }}>
                    {selectedCamera.direction}
                  </div>
                </div>
              </div>

              {/* Inference Trigger */}
              <div>
                <button
                  className="op-btn primary"
                  style={{ width: "100%", padding: "8px" }}
                  disabled={processing}
                  onClick={() => handleRunInference(selectedCamera.cameraId)}
                >
                  {processing ? "Processing Video via Python ML..." : `Run ANPR Inference on ${selectedCamera.cameraId}`}
                </button>

                {inferenceStatus && (
                  <div style={{ fontSize: "11px", color: "var(--accent)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
                    {inferenceStatus}
                  </div>
                )}
              </div>

              {/* Recent Detections for this camera */}
              <div style={{ marginTop: "4px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Recent Observations ({cameraDetections.length})
                </div>

                {cameraDetections.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                    No detections recorded for this camera.
                  </div>
                ) : (
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Plate</th>
                        <th>Time</th>
                        <th>Confidence</th>
                        <th>Track ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cameraDetections.slice(0, 6).map((d) => (
                        <tr key={d._id}>
                          <td>
                            <span className="op-badge plate">{d.plate}</span>
                          </td>
                          <td style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td style={{ color: "var(--status-green)", fontWeight: 600 }}>{(d.confidence * 100).toFixed(1)}%</td>
                          <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>#{d.trackId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Select a camera to view feed details and recent observations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
