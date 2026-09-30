import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../services/api";
import { GISMap, type CameraMarkerData } from "../components/Map/GISMap";

export const AnalyticsPage: React.FC = () => {
  const [trafficOverview, setTrafficOverview] = useState<any | null>(null);
  const [cameraAnalytics, setCameraAnalytics] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [cameras, setCameras] = useState<CameraMarkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [trafficRes, camStatsRes, movementsRes, camsRes] = await Promise.all([
          api.getTrafficAnalytics().catch(() => ({ success: false, data: null })),
          api.getCameraAnalytics().catch(() => ({ success: false, data: [] })),
          api.getMovements().catch(() => ({ success: false, data: [] })),
          api.getCameras().catch(() => ({ success: false, data: [] })),
        ]);

        if (trafficRes.success) setTrafficOverview(trafficRes.data);
        if (camStatsRes.success) setCameraAnalytics(camStatsRes.data);
        if (movementsRes.success) setMovements(movementsRes.data);
        if (camsRes.success) setCameras(camsRes.data);
      } catch (err: any) {
        console.error("Analytics load error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const hourlyChartData = (trafficOverview?.hourlyTrend || []).map((h: any) => ({
    hour: h.hour,
    reads: h.detections,
  }));

  const cameraChartData = cameraAnalytics.map((c) => ({
    name: c.cameraId,
    detections: c.detectionCount,
    uniqueVehicles: c.uniqueVehicles,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Urban Traffic Analytics & Movement Intelligence
          </h2>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
            Real-time volume aggregations, origin-destination patterns, and network density
          </div>
        </div>

        {trafficOverview && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>City Density Level:</span>
            <span
              className="op-badge"
              style={{
                backgroundColor:
                  trafficOverview.congestionIndicator === "HIGH"
                    ? "rgba(239, 68, 68, 0.2)"
                    : trafficOverview.congestionIndicator === "MODERATE"
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgba(34, 197, 94, 0.2)",
                color:
                  trafficOverview.congestionIndicator === "HIGH"
                    ? "#f87171"
                    : trafficOverview.congestionIndicator === "MODERATE"
                    ? "#fbbf24"
                    : "#4ade80",
                border: "1px solid currentColor",
                fontSize: "12px",
                padding: "3px 10px",
              }}
            >
              {trafficOverview.congestionIndicator} CONGESTION
            </span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        <div className="op-card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total ANPR Reads</div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
            {trafficOverview?.totalDetections ?? 0}
          </div>
        </div>

        <div className="op-card" style={{ borderLeft: "4px solid #7c3aed" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Unique Vehicles</div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
            {trafficOverview?.uniqueVehicles ?? 0}
          </div>
        </div>

        <div className="op-card" style={{ borderLeft: "4px solid var(--status-green)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Monitored Corridors</div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
            {movements.length} OD Paths
          </div>
        </div>

        <div className="op-card" style={{ borderLeft: "4px solid #94a3b8" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Telemetry Speed</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginTop: "10px" }}>
            No data available
          </div>
        </div>
      </div>

      {/* Primary Analytics Grid: 2 Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Chart 1: Hourly Traffic Trend */}
        <div className="op-card">
          <div className="op-card-header">
            <span className="op-card-title">Hourly Traffic Distribution (24h)</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Detection Volume by Hour</span>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Loading trend data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} interval={3} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", fontSize: "12px", borderRadius: "6px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reads"
                    name="Detections"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: "#2563eb", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Camera Detection Counts & Unique Vehicles */}
        <div className="op-card">
          <div className="op-card-header">
            <span className="op-card-title">Volume & Unique Plates per Camera</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Site Comparison</span>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
                Loading camera stats...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cameraChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", fontSize: "12px", borderRadius: "6px", boxShadow: "0 2px 4px rgba(0,0,0,0.08)" }}
                  />
                  <Bar dataKey="detections" name="Total Reads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uniqueVehicles" name="Unique Vehicles" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Analytics: Origin-Destination Data & Heatmap Layer */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px", alignItems: "start" }}>
        {/* Origin-Destination Patterns */}
        <div className="op-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="op-card-title">Origin-Destination (OD) Transit Patterns</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Inter-Camera Vehicle Movements</span>
          </div>

          {movements.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
              {loading ? "Calculating movement patterns..." : "No inter-camera transit observations recorded."}
            </div>
          ) : (
            <table className="op-table">
              <thead>
                <tr>
                  <th>Origin Site</th>
                  <th>Destination Site</th>
                  <th>Trip Count</th>
                  <th>Avg Transit</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{ fontWeight: 700, color: "#38bdf8" }}>{m.originCameraId}</span>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{m.originName}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#f59e0b" }}>{m.destinationCameraId}</span>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{m.destinationName}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: "#f8fafc" }}>
                      {m.movementCount} trips
                    </td>
                    <td style={{ color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                      {m.avgTravelMinutes} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Traffic Density Map Layer */}
        <div className="op-card" style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="op-card-title">Geographic Density Layer</span>
            <span style={{ fontSize: "11px", color: "#38bdf8" }}>Radius Scaled by Volume</span>
          </div>
          <GISMap
            cameras={cameras}
            showDensityLayer={true}
            height="320px"
          />
        </div>
      </div>
    </div>
  );
};
