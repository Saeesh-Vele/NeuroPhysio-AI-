import React, { type FC, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useAppStore } from "../../store/useAppStore";
import {
  HiHome,
  HiBolt,
  HiHeart,
  HiCpuChip,
  HiChartBar,
  HiDocumentText,
  HiChatBubbleLeftRight,
  HiCog6Tooth,
  HiArrowRightOnRectangle,
} from "react-icons/hi2";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: "/dashboard",              label: "Dashboard",         icon: <HiHome size={18} /> },
  { to: "/dashboard/exercise",     label: "Exercise Session",  icon: <HiBolt size={18} /> },
  { to: "/dashboard/pain-tracker", label: "Pain Tracker",      icon: <HiHeart size={18} /> },
  { to: "/dashboard/cognitive",    label: "Cognitive Trainer",  icon: <HiCpuChip size={18} /> },
  { to: "/dashboard/progress",     label: "Progress",          icon: <HiChartBar size={18} /> },
  { to: "/dashboard/ai-chat",      label: "AI Chat",            icon: <HiChatBubbleLeftRight size={18} /> },
  { to: "/dashboard/doctor-report",label: "Doctor Report",     icon: <HiDocumentText size={18} /> },
  { to: "/dashboard/settings",     label: "Settings",          icon: <HiCog6Tooth size={18} /> },
];

const Sidebar: FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const { user, firebaseUser, reset } = useAppStore();

  const displayName = user?.name || firebaseUser?.displayName || "User";
  const displayEmail = user?.email || firebaseUser?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      reset();
      navigate("/auth");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay${mobileOpen ? " visible" : ""}`}
        onClick={onCloseMobile}
      />

      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        {/* Brand */}
        <button className="sidebar__brand" onClick={() => navigate("/")}>
          <div className="sidebar__brand-icon">N</div>
          <span className="sidebar__brand-name">NeuroPhysio</span>
        </button>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? " active" : ""}`
              }
              onClick={onCloseMobile}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — User info */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">{initial}</div>
            <div>
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-email">{displayEmail}</div>
            </div>
            <button
              className="sidebar__user-logout"
              title="Logout"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <HiArrowRightOnRectangle size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
