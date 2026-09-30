import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useLiveUpdates } from "../hooks/useLiveUpdates";

interface AlertItem {
  _id: string;
  plate: string;
  type: string;
  cameraId: string;
  cameraName?: string;
  timestamp: string | Date;
  description: string;
  status: "ACTIVE" | "RESOLVED";
  createdAt: string | Date;
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts(filter);
      if (res.success) {
        setAlerts(res.alerts);
        setTotalCount(res.total);
        setActiveCount(res.activeCount);
        if (selectedAlert) {
          const updated = res.alerts.find((a: AlertItem) => a._id === selectedAlert._id);
          if (updated) setSelectedAlert(updated);
        }
      }
    } catch (err: any) {
      console.error("Failed to load alerts:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, selectedAlert]);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  useLiveUpdates({
    onAlert: () => {
      loadAlerts();
    },
  });

  const handleResolveAlert = async (alertId: string) => {
    try {
      setActionLoading(true);
      await api.resolveAlert(alertId);
      await loadAlerts();
    } catch (err: any) {
      alert(`Failed to resolve alert: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      {/* Header bar with Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Security Alerts & Blacklist Violations
          </h2>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
            Real-time security triggers from configured vehicle watchlists and route rules
          </div>
        </div>

        {/* Filter buttons: All, Active, Resolved */}
        <div style={{ display: "flex", gap: "6px", background: "#0b1120", padding: "4px", borderRadius: "6px", border: "1px solid #1e293b" }}>
          <button
            type="button"
            className={`op-btn ${filter === "ALL" ? "primary" : ""}`}
            style={{ fontSize: "12px", padding: "4px 12px" }}
            onClick={() => setFilter("ALL")}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`op-btn ${filter === "ACTIVE" ? "primary" : ""}`}
            style={{ fontSize: "12px", padding: "4px 12px" }}
            onClick={() => setFilter("ACTIVE")}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`op-btn ${filter === "RESOLVED" ? "primary" : ""}`}
            style={{ fontSize: "12px", padding: "4px 12px" }}
            onClick={() => setFilter("RESOLVED")}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Main Table & Details Split View */}
      <div style={{ display: "grid", gridTemplateColumns: selectedAlert ? "1.3fr 1fr" : "1fr", gap: "16px", alignItems: "start" }}>
        {/* Alerts Table */}
        <div className="op-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="op-card-title">Alert Incidents Log</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Click any row to open incident details</span>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              {loading ? "Loading alert stream..." : `No ${filter.toLowerCase()} alerts recorded.`}
            </div>
          ) : (
            <table className="op-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Camera</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((al) => {
                  const isSelected = selectedAlert?._id === al._id;
                  return (
                    <tr
                      key={al._id}
                      onClick={() => setSelectedAlert(al)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "var(--accent-light)" : undefined,
                      }}
                    >
                      <td>
                        <span className="op-badge plate">{al.plate}</span>
                      </td>
                      <td>
                        <span className="op-badge alert">{al.type}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "var(--accent)" }}>{al.cameraId}</span>
                        {al.cameraName && al.cameraName !== al.cameraId && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{al.cameraName}</div>
                        )}
                      </td>
                      <td style={{ color: "var(--text-main)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        {new Date(al.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          {new Date(al.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </div>
                      </td>
                      <td>
                        <span className={`op-badge ${al.status === "ACTIVE" ? "alert" : "resolved"}`}>
                          {al.status}
                        </span>
                      </td>
                      <td>
                        {al.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className="op-btn"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                            disabled={actionLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveAlert(al._id);
                            }}
                          >
                            Resolve
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Alert Details Panel */}
        {selectedAlert && (
          <div className="op-card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <span className="op-card-title">Incident Details</span>
              <button
                type="button"
                className="op-btn"
                style={{ fontSize: "11px", padding: "2px 8px" }}
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="op-badge plate" style={{ fontSize: "16px", padding: "4px 10px" }}>
                {selectedAlert.plate}
              </span>
              <span className={`op-badge ${selectedAlert.status === "ACTIVE" ? "alert" : "resolved"}`}>
                {selectedAlert.status}
              </span>
            </div>

            {/* Description / Watchlist match rule */}
            <div style={{ background: "var(--bg-card-alt)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
                Trigger Reason & Rule
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-main)", lineHeight: "1.4", fontWeight: 500 }}>
                {selectedAlert.description || "Blacklist match triggered by automated ANPR filter."}
              </div>
            </div>

            {/* Meta Attributes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "var(--bg-card-alt)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Camera Checkpoint</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>
                  {selectedAlert.cameraId}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{selectedAlert.cameraName}</div>
              </div>

              <div style={{ background: "var(--bg-card-alt)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Incident Timestamp</div>
                <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px", fontWeight: 600 }}>
                  {new Date(selectedAlert.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <Link
                to={`/tracking?plate=${encodeURIComponent(selectedAlert.plate)}`}
                className="op-btn"
                style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "8px 12px" }}
              >
                Track Trajectory on Map &rarr;
              </Link>

              {selectedAlert.status === "ACTIVE" && (
                <button
                  type="button"
                  className="op-btn primary"
                  style={{ flex: 1, padding: "8px 12px" }}
                  disabled={actionLoading}
                  onClick={() => handleResolveAlert(selectedAlert._id)}
                >
                  {actionLoading ? "Resolving..." : "Mark as Resolved"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
