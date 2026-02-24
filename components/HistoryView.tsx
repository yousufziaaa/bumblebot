"use client";

import { useEffect, useState } from "react";
import { listVideoClassifications, VideoClassification, deleteClassification } from "@/lib/api";
import { Trash2, RefreshCw, Loader2, Film } from "lucide-react";

export default function HistoryView() {
  const [records, setRecords] = useState<VideoClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVideoClassifications();
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteClassification(id);
      setRecords((prev) => prev.filter((r) => r.record_id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === "completed" || status === "done") return "var(--green)";
    if (status === "processing" || status === "running") return "#eab308";
    if (status === "failed" || status === "error") return "var(--orange)";
    return "var(--text-dim)";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span className="tag tag-green">HISTORY</span>
            {!loading && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>{records.length} RECORDS</span>}
          </div>
          <h1 style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Classification History
          </h1>
          <p style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13 }}>
            Past image and video classifications from the BumbleBot system.
          </p>
        </div>
        <button
          onClick={fetchRecords}
          disabled={loading}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          {loading ? <Loader2 size={12} className="pulse" /> : <RefreshCw size={12} />}
          REFRESH
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "var(--orange-muted)",
            border: "1px solid #4a2010",
            borderRadius: 6,
            padding: "12px 16px",
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--orange)",
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="pulse" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--green)", letterSpacing: "0.12em" }}>
            LOADING...
          </div>
        </div>
      ) : records.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            height: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Film size={28} color="var(--text-faint)" />
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            NO CLASSIFICATIONS YET
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>
            Run a classification to see results here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 100px 80px 48px",
              gap: 16,
              padding: "8px 16px",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-faint)",
              letterSpacing: "0.1em",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>RECORD ID</span>
            <span>TIMESTAMP</span>
            <span>STATUS</span>
            <span>COUNT</span>
            <span></span>
          </div>

          {records.map((r) => (
            <div
              key={r.record_id}
              className="fade-up"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 100px 80px 48px",
                gap: 16,
                padding: "14px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.record_id}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>
                {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "—"}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: statusColor(r.status), textTransform: "uppercase" }}>
                {r.status}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {r.total_count ?? r.frame_count ?? "—"}
              </span>
              <button
                onClick={() => handleDelete(r.record_id)}
                disabled={deleting === r.record_id}
                style={{
                  background: "transparent",
                  border: "1px solid transparent",
                  borderRadius: 4,
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#4a2010";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--orange-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {deleting === r.record_id ? (
                  <Loader2 size={12} color="var(--orange)" className="pulse" />
                ) : (
                  <Trash2 size={12} color="var(--text-faint)" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
