import React, { useState, useRef } from "react";
import { api } from "../services/api";

export const DetectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"IMAGE" | "VIDEO">("IMAGE");

  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState<boolean>(false);
  const [imageResult, setImageResult] = useState<any | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoProcessing, setVideoProcessing] = useState<boolean>(false);
  const [videoResult, setVideoResult] = useState<any | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageResult(null);
      setImageError(null);
    }
  };

  // Run Image ANPR
  const handleProcessImage = async () => {
    if (!imageFile) return;
    try {
      setImageProcessing(true);
      setImageError(null);
      const res = await api.uploadImage(imageFile);
      if (res.success) {
        setImageResult(res);
      } else {
        setImageError("Inference failed to return valid detections.");
      }
    } catch (err: any) {
      setImageError(err.message || "Failed to process image.");
    } finally {
      setImageProcessing(false);
    }
  };

  // Handle Video Selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoResult(null);
      setVideoError(null);
    }
  };

  // Run Video ANPR
  const handleProcessVideo = async () => {
    if (!videoFile) return;
    try {
      setVideoProcessing(true);
      setVideoError(null);
      const res = await api.uploadVideo(videoFile, 2);
      if (res.success) {
        setVideoResult(res);
      } else {
        setVideoError("Video inference failed.");
      }
    } catch (err: any) {
      setVideoError(err.message || "Failed to process video.");
    } finally {
      setVideoProcessing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Header bar */}
      <div className="op-page-header">
        <div>
          <h2 className="op-page-title">ANPR Media Detection Pipeline</h2>
          <div className="op-page-subtitle">
            Submit image or video files for license plate detection & OCR recognition
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`op-btn ${activeTab === "IMAGE" ? "primary" : ""}`}
            onClick={() => setActiveTab("IMAGE")}
          >
            Upload Image
          </button>
          <button
            type="button"
            className={`op-btn ${activeTab === "VIDEO" ? "primary" : ""}`}
            onClick={() => setActiveTab("VIDEO")}
          >
            Upload Video
          </button>
        </div>
      </div>

      {/* ================= IMAGE TAB ================= */}
      {activeTab === "IMAGE" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px", alignItems: "start" }}>
          {/* Left: Upload and Preview */}
          <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="op-card-header">
              <span className="op-card-title">Select Image File</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Supports JPG, PNG, WEBP</span>
            </div>

            <input
              type="file"
              ref={imageInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="op-btn"
                onClick={() => imageInputRef.current?.click()}
              >
                {imageFile ? "Change Image" : "Select Image"}
              </button>

              <button
                type="button"
                className="op-btn primary"
                disabled={!imageFile || imageProcessing}
                onClick={handleProcessImage}
              >
                {imageProcessing ? "Processing via ML..." : "Run ANPR Inference"}
              </button>
            </div>

            {imageFile && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
              </div>
            )}

            {/* Image Preview Box */}
            <div
              style={{
                width: "100%",
                minHeight: "260px",
                maxHeight: "360px",
                backgroundColor: "var(--bg-card-alt)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Upload Preview"
                  style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain", display: "block" }}
                />
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  Select an image to view preview.
                </div>
              )}
            </div>

            {imageError && (
              <div style={{ color: "var(--status-red)", fontSize: "12px", background: "var(--status-red-bg)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--status-red-border)" }}>
                {imageError}
              </div>
            )}
          </div>

          {/* Right: Real Detection Results */}
          <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="op-card-header">
              <span className="op-card-title">ANPR Detection Results</span>
              {imageResult && (
                <span className="op-badge online">
                  {imageResult.detectionsCount} Plate(s) Detected
                </span>
              )}
            </div>

            {imageProcessing ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--accent)" }}>
                Processing image through YOLO detector & Fast-Plate-OCR...
              </div>
            ) : imageResult ? (
              imageResult.rawDetections && imageResult.rawDetections.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {imageResult.rawDetections.map((det: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--bg-card-alt)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                          Detected Plate
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <span className="op-badge plate" style={{ fontSize: "18px", padding: "4px 10px" }}>
                            {det.plate}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                          Confidence
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--status-green)", marginTop: "2px" }}>
                          {(det.confidence * 100).toFixed(1)}%
                        </div>
                        {det.trackId !== undefined && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Track ID: #{det.trackId}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    &bull; Observation recorded to MongoDB with source type: <span className="op-badge source-upload">UPLOAD_IMAGE</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                  No license plate detected
                </div>
              )
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                Upload and process an image to inspect detected license plates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIDEO TAB ================= */}
      {activeTab === "VIDEO" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px", alignItems: "start" }}>
          {/* Left: Upload and Video Preview */}
          <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="op-card-header">
              <span className="op-card-title">Select Video File</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Supports MP4, WEBM, MOV</span>
            </div>

            <input
              type="file"
              ref={videoInputRef}
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideoSelect}
              style={{ display: "none" }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="op-btn"
                onClick={() => videoInputRef.current?.click()}
              >
                {videoFile ? "Change Video" : "Select Video"}
              </button>

              <button
                type="button"
                className="op-btn primary"
                disabled={!videoFile || videoProcessing}
                onClick={handleProcessVideo}
              >
                {videoProcessing ? "Processing Video..." : "Run ANPR on Video"}
              </button>
            </div>

            {videoFile && (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}

            {/* Video Player Box */}
            <div
              style={{
                width: "100%",
                minHeight: "260px",
                maxHeight: "360px",
                backgroundColor: "#000000",
                borderRadius: "6px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {videoPreview ? (
                <video
                  src={videoPreview}
                  controls
                  muted
                  playsInline
                  style={{ width: "100%", maxHeight: "360px", objectFit: "contain", display: "block" }}
                />
              ) : (
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                  Select a video file to view player preview.
                </div>
              )}
            </div>

            {videoError && (
              <div style={{ color: "var(--status-red)", fontSize: "12px", background: "var(--status-red-bg)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--status-red-border)" }}>
                {videoError}
              </div>
            )}
          </div>

          {/* Right: Real Video Detections */}
          <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="op-card-header">
              <span className="op-card-title">Video Observation Stream</span>
              {videoResult && (
                <span className="op-badge online">
                  {videoResult.detectionsCount} Detection(s)
                </span>
              )}
            </div>

            {videoProcessing ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--accent)" }}>
                Processing video with ByteTrack & Fast-Plate-OCR...
              </div>
            ) : videoResult ? (
              videoResult.rawDetections && videoResult.rawDetections.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Plate</th>
                        <th>Confidence</th>
                        <th>Track ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoResult.rawDetections.map((det: any, idx: number) => (
                        <tr key={idx}>
                          <td>
                            <span className="op-badge plate">{det.plate}</span>
                          </td>
                          <td style={{ color: "var(--status-green)", fontWeight: 600 }}>
                            {(det.confidence * 100).toFixed(1)}%
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                            #{det.trackId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    &bull; Stored to MongoDB with source type: <span className="op-badge source-upload">UPLOAD_VIDEO</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                  No license plates detected
                </div>
              )
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                Upload and process a video file to observe tracked vehicles and plates.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
