import React, { useState, type FC } from "react";
import { HiBars3 } from "react-icons/hi2";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import "./DashboardPage.css";

const DashboardLayout: FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen((o) => !o)}
      >
        <HiBars3 size={22} />
      </button>

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content — Outlet renders the matched child route */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
