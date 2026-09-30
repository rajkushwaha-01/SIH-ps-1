import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export const AppLayout: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "var(--text-main)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
};
