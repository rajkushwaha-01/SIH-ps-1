import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../services/api";

export const LiveCameraPage: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestDetection, setLatestDetection] = useState<any | null>(null);
  const [recentDetections, setRecentDetections] = useState<any[]>([]);
  const [samplingActive, setSamplingActive] = useState<boolean>(false);
  const [inferenceCount, setInferenceCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);
  const isInferringRef = useRef<boolean>(false);

  // Stop camera lifecycle
  const handleStopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setSamplingActive(false);
  }, []);

  // Frame sampling and ML inference loop
  const captureAndInfer = useCallback(async () => {
    if (!videoRef.current || !cameraActive || isInferringRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      isInferringRef.current = true;
      setSamplingActive(true);

      // Capture frame to canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      // Send sampled frame to Node.js -> Python ML Service
      const res = await api.liveInference(dataUrl);

      setInferenceCount((prev) => prev + 1);

      if (res.success && res.rawDetections && res.rawDetections.length > 0) {
        const det = res.rawDetections[0];
        const newObs = {
          plate: det.plate,
          confidence: det.confidence,
          trackId: det.trackId,
          timestamp: new Date(),
        };
        setLatestDetection(newObs);
        setRecentDetections((prev) => [newObs, ...prev.slice(0, 9)]);
      } else {
        setLatestDetection({ none: true, timestamp: new Date() });
      }
    } catch (err: any) {
      console.warn("Live inference frame error:", err.message);
    } finally {
      isInferringRef.current = false;
      setSamplingActive(false);
    }
  }, [cameraActive]);

  // Start camera lifecycle
  const handleStartCamera = async () => {
    try {
      setErrorMsg(null);
      setLatestDetection(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser camera API (getUserMedia) not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Camera permission was denied. Please allow camera access in browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("No camera available on this device.");
      } else {
        setErrorMsg(err.message || "Failed to start camera.");
      }
      handleStopCamera();
    }
  };

  // Set up controlled frame sampling interval (750ms)
  useEffect(() => {
    if (cameraActive) {
      intervalRef.current = setInterval(captureAndInfer, 750);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraActive, captureAndInfer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, [handleStopCamera]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Header bar */}
      <div className="op-page-header">
        <div>
          <h2 className="op-page-title">Live Browser Camera & Real-Time ANPR</h2>
          <div className="op-page-subtitle">
            Streams real webcam video and performs controlled frame inference via YOLO & Fast-Plate-OCR
          </div>
        </div>

        {/* Camera Start / Stop Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {cameraActive ? (
            <button
              type="button"
              className="op-btn danger"
              onClick={handleStopCamera}
            >
              Stop Camera
            </button>
          ) : (
            <button
              type="button"
              className="op-btn primary"
              onClick={handleStartCamera}
            >
              Start Camera
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: "var(--status-red)", fontSize: "12px", background: "var(--status-red-bg)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--status-red-border)" }}>
          {errorMsg}
        </div>
      )}

      {/* Main Layout: 2 Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", alignItems: "start" }}>
        {/* Left: Real Webcam Feed */}
        <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="op-card-header">
            <span className="op-card-title">Webcam Stream</span>
            {cameraActive ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="status-live">
                  <span className="status-dot"></span>
                  LIVE
                </span>
                {samplingActive && (
                  <span style={{ fontSize: "10px", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    INFERRING...
                  </span>
                )}
              </div>
            ) : (
              <span className="op-badge offline">OFFLINE</span>
            )}
          </div>

          {/* Actual Video Element */}
          <div
            style={{
              width: "100%",
              minHeight: "320px",
              backgroundColor: "#000000",
              borderRadius: "6px",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: "420px",
                display: cameraActive ? "block" : "none",
                objectFit: "contain",
              }}
            />

            {!cameraActive && (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 16px" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc", marginBottom: "6px" }}>
                  Webcam is Inactive
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                  Click &quot;Start Camera&quot; above to request browser camera permission and initiate feed.
                </div>
                <button
                  type="button"
                  className="op-btn primary"
                  onClick={handleStartCamera}
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
            <span>Controlled frame sampling: 750ms interval</span>
            <span>Frames analyzed: {inferenceCount}</span>
          </div>
        </div>

        {/* Right: Live ANPR Feed Results */}
        <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="op-card-header">
            <span className="op-card-title">Live Plate Detection</span>
            {latestDetection && !latestDetection.none && (
              <span className="op-badge online">Plate Detected</span>
            )}
          </div>

          {/* Current Frame Status */}
          <div
            style={{
              background: "var(--bg-card-alt)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            {!cameraActive ? (
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Start camera to begin real-time license plate detection.
              </div>
            ) : latestDetection ? (
              latestDetection.none ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  No plate detected in current frame
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Identified License Plate
                  </div>
                  <div>
                    <span className="op-badge plate" style={{ fontSize: "22px", padding: "6px 14px" }}>
                      {latestDetection.plate}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "4px", fontSize: "13px" }}>
                    <span>
                      Confidence: <strong style={{ color: "var(--status-green)" }}>{(latestDetection.confidence * 100).toFixed(1)}%</strong>
                    </span>
                    {latestDetection.trackId && (
                      <span style={{ color: "var(--text-muted)" }}>
                        Track ID: #{latestDetection.trackId}
                      </span>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                Awaiting first video frame for inference...
              </div>
            )}
          </div>

          {/* Recent Live Observations Log */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
              Recent Live Detections ({recentDetections.length})
            </div>

            {recentDetections.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                No license plates recorded during this live session.
              </div>
            ) : (
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Plate</th>
                    <th>Time</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDetections.map((d, i) => (
                    <tr key={i}>
                      <td>
                        <span className="op-badge plate">{d.plate}</span>
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td style={{ color: "var(--status-green)", fontWeight: 600 }}>
                        {(d.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}>
              &bull; Live reads stored to MongoDB with source type: <span className="op-badge source-webcam">WEBCAM</span> and camera ID: <code style={{ fontFamily: "var(--font-mono)" }}>CAM-WEBCAM</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
