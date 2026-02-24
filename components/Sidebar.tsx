"use client";

import { Upload, LayoutDashboard, Clock, PlayCircle, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

type View = "upload" | "dashboard" | "history" | "demo";

interface SidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  const nav = [
    { id: "upload" as View, label: "Classify", icon: Upload, orange: false },
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard, orange: false },
    { id: "history" as View, label: "History", icon: Clock, orange: false },
    { id: "demo" as View, label: "Demo Mode", icon: PlayCircle, orange: true },
  ];

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 12px",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 12px 24px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--green)",
            letterSpacing: "0.05em",
          }}
        >
          BUMBLEBOT
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text-faint)",
            letterSpacing: "0.08em",
            marginTop: 2,
          }}
        >
          SYDE 462 · TEAM 22
        </div>
      </div>

      {/* Nav */}
      <nav style={{ marginTop: 20, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map(({ id, label, icon: Icon, orange }) => {
          const isActive = activeView === id;
          let className = "nav-item";
          if (isActive && orange) className += " active-orange";
          else if (isActive) className += " active";
          return (
            <button
              key={id}
              className={className}
              onClick={() => onViewChange(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {online === null ? (
          <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-faint)" }} />
        ) : online ? (
          <Wifi size={12} color="var(--green)" />
        ) : (
          <WifiOff size={12} color="var(--orange)" />
        )}
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: online ? "var(--green)" : online === false ? "var(--orange)" : "var(--text-faint)",
            letterSpacing: "0.08em",
          }}
        >
          {online === null ? "CONNECTING..." : online ? "API ONLINE" : "API OFFLINE"}
        </span>
      </div>
    </aside>
  );
}
