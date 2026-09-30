import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { GISMap, type TrajectoryPointData, type CameraMarkerData } from "../components/Map/GISMap";

export const TrackingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPlate = searchParams.get("plate") || "";

  const [inputPlate, setInputPlate] = useState<string>(initialPlate);
  const [searchedPlate, setSearchedPlate] = useState<string>("");
  const [vehicleData, setVehicleData] = useState<any | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<any | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [allCameras, setAllCameras] = useState<CameraMarkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load available vehicles and camera sites
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [vehRes, camRes] = await Promise.all([
          api.getVehicles().catch(() => ({ success: false, vehicles: [] })),
          api.getCameras().catch(() => ({ success: false, data: [] })),
        ]);
        if (vehRes.success) setAvailableVehicles(vehRes.vehicles);
        if (camRes.success) setAllCameras(camRes.data);
      } catch (err: any) {
        console.error("Tracking init error:", err.message);
      }
    };
    fetchInit();
  }, []);

  const handleSearch = useCallback(async (plateToSearch?: string) => {
    const target = (plateToSearch || inputPlate).trim().toUpperCase();
    if (!target) return;

    setLoading(true);
    setErrorMsg(null);
    setSearchedPlate(target);
    setSearchParams({ plate: target });

    try {
      const [vRes, tRes] = await Promise.all([
        api.getVehicle(target).catch(() => ({ success: false, data: null })),
        api.getTrajectory(target).catch(() => ({ success: false, data: null })),
      ]);

      const points = tRes?.data?.points || [];
      if (!vRes.success || !vRes.data || points.length === 0) {
        setErrorMsg("No trajectory data available");
        setVehicleData(null);
        setTrajectoryData(null);
      } else {
        setVehicleData(vRes.data);
        setTrajectoryData(tRes?.data || null);
      }
    } catch (err: any) {
      setErrorMsg("No trajectory data available");
      setVehicleData(null);
      setTrajectoryData(null);
    } finally {
      setLoading(false);
    }
  }, [inputPlate, setSearchParams]);

  useEffect(() => {
    if (initialPlate) {
      handleSearch(initialPlate);
    }
  }, [initialPlate, handleSearch]);

  const trajectoryPoints: TrajectoryPointData[] = (trajectoryData?.points || []).map((p: any) => ({
    cameraId: p.cameraId,
    cameraName: p.cameraName,
    timestamp: p.timestamp,
    latitude: p.latitude,
    longitude: p.longitude,
    direction: p.direction,
    confidence: p.confidence,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Primary UI: Plate Search */}
      <div className="op-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span className="op-card-title">Vehicle Trajectory Search</span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Reconstructs multi-camera observation points chronologically
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          style={{ display: "flex", gap: "10px", alignItems: "center" }}
        >
          <input
            type="text"
            className="op-input"
            style={{ flex: 1, textTransform: "uppercase", fontSize: "14px", letterSpacing: "1px" }}
            placeholder="Enter vehicle number (e.g. MP0AA8123 or MP04AB1234)..."
            value={inputPlate}
            onChange={(e) => setInputPlate(e.target.value.toUpperCase())}
          />
          <button type="submit" className="op-btn primary" disabled={loading} style={{ padding: "8px 20px" }}>
            {loading ? "Searching..." : "Search Trajectory"}
          </button>
        </form>

        {/* Quick select chips for detected plates */}
        {availableVehicles.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Recently Detected:</span>
            {availableVehicles.slice(0, 6).map((v) => (
              <button
                key={v.plate}
                type="button"
                className="op-btn"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => {
                  setInputPlate(v.plate);
                  handleSearch(v.plate);
                }}
              >
                {v.plate} ({v.totalDetections} obs)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="op-card" style={{ borderLeft: "3px solid #ef4444", color: "#dc2626", fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      {/* After Search Results */}
      {vehicleData && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Vehicle Summary Card */}
          <div className="op-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Vehicle Plate</div>
              <div style={{ marginTop: "4px" }}>
                <span className="op-badge plate" style={{ fontSize: "16px", padding: "4px 10px" }}>
                  {vehicleData.plate}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>First Observed</div>
              <div style={{ fontSize: "13px", color: "var(--text-main)", fontFamily: "var(--font-mono)", marginTop: "4px", fontWeight: 600 }}>
                {new Date(vehicleData.firstSeen).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Last Observed</div>
              <div style={{ fontSize: "13px", color: "var(--text-main)", fontFamily: "var(--font-mono)", marginTop: "4px", fontWeight: 600 }}>
                {new Date(vehicleData.lastSeen).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Detections</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>
                {vehicleData.totalDetections} observations
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Last Camera</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--status-green)", marginTop: "4px" }}>
                {vehicleData.lastCameraId}
              </div>
            </div>
          </div>

          {/* MAIN: Large Map with Trajectory */}
          <div className="op-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="op-card-title">Reconstructed Camera Observation Path</span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <strong style={{ color: "#ea580c" }}>{trajectoryPoints.length}</strong> Observations Recorded (
                <strong style={{ color: "var(--accent)" }}>{new Set(trajectoryPoints.map((p) => p.cameraId)).size}</strong> CCTV Sites)
              </span>
            </div>

            <GISMap
              cameras={allCameras}
              trajectoryPoints={trajectoryPoints}
              height="480px"
            />
          </div>

          {/* THEN: Chronological Timeline */}
          <div className="op-card">
            <div className="op-card-header">
              <span className="op-card-title">Chronological Camera Observation Timeline</span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Discrete observations returned by backend. No continuous GPS claimed.
              </span>
            </div>

            {trajectoryData?.points && trajectoryData.points.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
                {trajectoryData.points.map((pt: any, index: number) => {
                  const timeStr = new Date(pt.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = new Date(pt.timestamp).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                        position: "relative",
                        paddingLeft: "8px",
                      }}
                    >
                      {/* Node number badge */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "#f59e0b",
                          color: "#0f172a",
                          fontWeight: 700,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 0 8px rgba(245, 158, 11, 0.6)",
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Checkpoint Details */}
                      <div
                        style={{
                          flex: 1,
                          background: "var(--bg-card-alt)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "8px",
                          boxShadow: "var(--card-shadow)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                              {pt.cameraId}
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                              {pt.cameraName}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {pt.location || "Urban Sector"} &bull; GIS: ({pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)})
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                            {timeStr}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {dateStr}
                            {pt.timeFromPreviousMinutes !== undefined && (
                              <span style={{ color: "var(--status-amber)", marginLeft: "6px", fontWeight: 600 }}>
                                (+{pt.timeFromPreviousMinutes} min elapsed)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                No camera observation points recorded for this plate.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial state placeholder if no plate searched */}
      {!searchedPlate && !loading && (
        <div className="op-card" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Enter a vehicle license plate number above to inspect chronological camera detections and map trajectory.
        </div>
      )}
    </div>
  );
};
