import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../services/api";
import "./Navbar.css";

export const Navbar: React.FC = () => {
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const res = await api.getAlerts("ACTIVE");
        setActiveAlertCount(res.activeCount || 0);
      } catch {
        // Silent catch for initial load before backend is up
      }
    };
    fetchAlertCount();
    const alertInterval = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(alertInterval);
  }, []);

  return (
    <header className="navbar-header">
      <NavLink to="/" className="navbar-brand">
        <span className="navbar-title">ANPR City</span>
      </NavLink>

      <nav className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Dashboard
        </NavLink>
        <NavLink to="/cameras" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Cameras
        </NavLink>
        <NavLink to="/detection" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Detection
        </NavLink>
        <NavLink to="/live-camera" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Live Camera
        </NavLink>
        <NavLink to="/tracking" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Tracking
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Analytics
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          Alerts
          {activeAlertCount > 0 && <span className="nav-badge">{activeAlertCount}</span>}
        </NavLink>
      </nav>

      <div className="navbar-meta">
        <div className="status-live">
          <span className="status-dot"></span>
          <span>ONLINE</span>
        </div>
        <span>{currentTime}</span>
      </div>
    </header>
  );
};
