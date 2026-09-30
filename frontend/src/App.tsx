import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/Layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CamerasPage } from "./pages/CamerasPage";
import { DetectionPage } from "./pages/DetectionPage";
import { LiveCameraPage } from "./pages/LiveCameraPage";
import { TrackingPage } from "./pages/TrackingPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AlertsPage } from "./pages/AlertsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="cameras" element={<CamerasPage />} />
          <Route path="detection" element={<DetectionPage />} />
          <Route path="live-camera" element={<LiveCameraPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
