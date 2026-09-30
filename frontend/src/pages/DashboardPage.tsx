import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { GISMap, type CameraMarkerData, type AlertMarkerData } from "../components/Map/GISMap";
import { useLiveUpdates } from "../hooks/useLiveUpdates";

interface TrafficStats {
  totalDetections: number;
  uniqueVehicles: number;
  activeCameras: number;
  totalCameras: number;
  congestionIndicator: string;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<TrafficStats>({
    totalDetections: 0,
    uniqueVehicles: 0,
    activeCameras: 0,
    totalCameras: 0,
    congestionIndicator: "LOW",
  });
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
  const [cameras, setCameras] = useState<CameraMarkerData[]>([]);
  const [recentDetections, setRecentDetections] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [alertMarkers, setAlertMarkers] = useState<AlertMarkerData[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [trafficRes, alertsRes, camerasRes, detectionsRes] = await Promise.all([
        api.getTrafficAnalytics().catch(() => ({ success: false, data: null })),
        api.getAlerts("ACTIVE").catch(() => ({ success: false, alerts: [], activeCount: 0 })),
        api.getCameras().catch(() => ({ success: false, data: [] })),
        api.getDetections({ limit: 8 }).catch(() => ({ success: false, detections: [] })),
      ]);

      if (trafficRes?.success && trafficRes.data) {
        setStats(trafficRes.data);
      }

      if (alertsRes?.success) {
        setActiveAlertsCount(alertsRes.activeCount || 0);
        setRecentAlerts(alertsRes.alerts || []);

        // Map alerts to coordinates for GIS Map
        const camMap = new Map<string, { lat: number; lng: number }>();
        (camerasRes?.data || []).forEach((c: any) => {
          camMap.set(c.cameraId, { lat: c.latitude, lng: c.longitude });
        });

        const markers: AlertMarkerData[] = (alertsRes.alerts || [])
          .filter((a: any) => camMap.has(a.cameraId))
          .map((a: any) => {
            const coords = camMap.get(a.cameraId)!;
            return {
              plate: a.plate,
              type: a.type,
              cameraId: a.cameraId,
              latitude: coords.lat,
              longitude: coords.lng,
              timestamp: a.timestamp,
            };
          });
        setAlertMarkers(markers);
      }

      if (camerasRes?.success && camerasRes.data) {
        setCameras(camerasRes.data);
      }

      if (detectionsRes?.success && detectionsRes.detections) {
        setRecentDetections(detectionsRes.detections);
      }
    } catch (err: any) {
      console.error("Dashboard data load error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Real-time SSE updates
  useLiveUpdates({
    onAny: () => {
      loadDashboardData();
    },
  });

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.resolveAlert(alertId);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Failed to resolve alert: ${err.message}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* TOP: 4 Metrics directly from Backend APIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
        {/* Metric 1 */}
        <div className="op-card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
            Active Cameras
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", margin: "4px 0" }}>
            {stats.activeCameras}
            <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 400 }}> / {stats.totalCameras} ONLINE</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 500 }}>Registered CCTV Sites</div>
        </div>

        {/* Metric 2 */}
        <div className="op-card" style={{ borderLeft: "4px solid #7c3aed" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
            Vehicles Detected
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", margin: "4px 0" }}>
            {stats.uniqueVehicles}
          </div>
          <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 500 }}>Unique License Plates</div>
        </div>

        {/* Metric 3 */}
        <div className="op-card" style={{ borderLeft: "4px solid var(--status-green)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
            ANPR Reads
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", margin: "4px 0" }}>
            {stats.totalDetections}
          </div>
          <div style={{ fontSize: "11px", color: "var(--status-green)", fontWeight: 500 }}>Verified OCR Observations</div>
        </div>

        {/* Metric 4 */}
        <div className="op-card" style={{ borderLeft: "4px solid var(--status-red)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
            Active Alerts
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: activeAlertsCount > 0 ? "var(--status-red)" : "var(--text-main)", margin: "4px 0" }}>
            {activeAlertsCount}
          </div>
          <div style={{ fontSize: "11px", color: activeAlertsCount > 0 ? "var(--status-red)" : "var(--text-muted)", fontWeight: 500 }}>
            {activeAlertsCount > 0 ? "Requires Operator Action" : "No Critical Matches"}
          </div>
        </div>
      </div>

      {/* MAIN: Large GIS Map */}
      <div className="op-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="op-card-title">City GIS Sensor Network</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {cameras.length} Active Spatial Sensors
          </span>
        </div>

        <GISMap
          cameras={cameras}
          alerts={alertMarkers}
          selectedCameraId={selectedCameraId}
          onCameraClick={(camId) => setSelectedCameraId(camId)}
          showDensityLayer={true}
          height="460px"
        />
      </div>

      {/* SECONDARY: Recent Detections & Recent Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent Detections */}
        <div className="op-card">
          <div className="op-card-header">
            <span className="op-card-title">Recent Detections</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Live Ingestion Stream</span>
          </div>

          {recentDetections.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {loading ? "Loading detections..." : "No detection data available."}
            </div>
          ) : (
            <table className="op-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Camera</th>
                  <th>Time</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {recentDetections.map((det) => (
                  <tr key={det._id}>
                    <td>
                      <span className="op-badge plate">{det.plate}</span>
                    </td>
                    <td>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{det.cameraId}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                      {new Date(det.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td>
                      <span style={{ color: "var(--status-green)", fontWeight: 600 }}>
                        {(det.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="op-card">
          <div className="op-card-header">
            <span className="op-card-title">Active Security Alerts</span>
            <span className="op-badge alert">{recentAlerts.length} Active</span>
          </div>

          {recentAlerts.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
              {loading ? "Loading alerts..." : "No active alerts."}
            </div>
          ) : (
            <table className="op-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Camera</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((al) => (
                  <tr key={al._id}>
                    <td>
                      <span className="op-badge plate">{al.plate}</span>
                    </td>
                    <td>
                      <span className="op-badge alert">{al.type}</span>
                    </td>
                    <td>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{al.cameraId}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                      {new Date(al.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <button
                        className="op-btn"
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                        onClick={() => handleResolveAlert(al._id)}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
