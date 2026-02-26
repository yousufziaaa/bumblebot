"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ClassifyView from "@/components/ClassifyView";
import DashboardView from "@/components/DashboardView";
import HistoryView from "@/components/HistoryView";
import GalleryView from "@/components/GalleryView";
import DemoView from "@/components/DemoView";

type View = "upload" | "dashboard" | "gallery" | "history" | "demo";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("upload");

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 2 }}>
      {activeView !== "demo" && <Sidebar activeView={activeView} onViewChange={setActiveView} />}
      {activeView === "demo" && (
        <button
          onClick={() => setActiveView("upload")}
          style={{
            position: "fixed",
            bottom: 20,
            right: 24,
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 16px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--text-faint)",
            cursor: "pointer",
            letterSpacing: "0.08em",
          }}
        >
          EXIT DEMO
        </button>
      )}
      <main
        style={{
          marginLeft: activeView === "demo" ? 0 : 220,
          flex: 1,
          padding: activeView === "demo" ? 0 : "40px 48px",
          minHeight: "100vh",
        }}
      >
        {activeView === "upload" && <ClassifyView />}
        {activeView === "dashboard" && <DashboardView />}
        {activeView === "gallery" && <GalleryView />}
        {activeView === "history" && <HistoryView />}
        {activeView === "demo" && <DemoView />}
      </main>
    </div>
  );
}
