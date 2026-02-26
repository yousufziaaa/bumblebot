"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  Flower2,
} from "lucide-react";
import {
  getHeatmapData,
  HeatmapDataPoint,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://deenp03-capstone-backend.hf.space";

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  color: "var(--text-faint)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 14,
};

type SortKey = "date-desc" | "date-asc" | "features-desc" | "features-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "features-desc", label: "Most Features" },
  { value: "features-asc", label: "Fewest Features" },
];

function getFlowerCount(item: HeatmapDataPoint): number {
  return item.total_flowers ?? item.flower_count ?? item.flowers?.length ?? 0;
}

function getStageCounts(item: HeatmapDataPoint): Record<number, number> {
  if (item.stage_counts) {
    return {
      0: Number(item.stage_counts["0"] ?? 0),
      1: Number(item.stage_counts["1"] ?? 0),
      2: Number(item.stage_counts["2"] ?? 0),
    };
  }
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  item.flowers?.forEach((f) => {
    if (f.stage in counts) counts[f.stage]++;
  });
  return counts;
}

/* ─── thumbnail with fallback ─────────────────────────────────────── */
function Thumbnail({ id, style, onClick }: { id: string; style?: React.CSSProperties; onClick?: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_URL}/api/images/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("no image");
        return r.blob();
      })
      .then((blob) => {
        if (!cancelled) setSrc(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (failed || !src) {
    return (
      <div
        style={{
          ...style,
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ImageIcon size={28} color="var(--text-faint)" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={id}
      onClick={onClick}
      style={{ ...style, objectFit: "cover", cursor: onClick ? "zoom-in" : undefined }}
    />
  );
}

/* ─── lightbox ────────────────────────────────────────────────────── */
function ImageLightbox({
  ids,
  index,
  onClose,
  onNav,
}: {
  ids: string[];
  index: number;
  onClose: () => void;
  onNav: (idx: number) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const currentId = ids[index];

  useEffect(() => {
    setSrc(null);
    setErr(false);
    let cancelled = false;
    fetch(`${BASE_URL}/api/images/${currentId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((b) => {
        if (!cancelled) setSrc(URL.createObjectURL(b));
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < ids.length - 1) onNav(index + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, ids.length, onClose, onNav]);

  const navBtn: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    backdropFilter: "blur(4px)",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
        }}
      >
        <X size={18} />
      </button>

      {ids.length > 1 && index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
          style={{ ...navBtn, left: 16 }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "85vw", maxHeight: "85vh", cursor: "default" }}
      >
        {!src && !err && <Loader2 size={28} color="#fff" className="pulse" />}
        {err && (
          <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--mono)", fontSize: 13, textAlign: "center" }}>
            <ImageIcon size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <br />
            Image not available
          </div>
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Capture"
            style={{ maxWidth: "85vw", maxHeight: "85vh", borderRadius: 8, objectFit: "contain" }}
          />
        )}
      </div>

      {ids.length > 1 && index < ids.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
          style={{ ...navBtn, right: 16 }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {ids.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {index + 1} / {ids.length}
        </div>
      )}
    </div>
  );
}

/* ─── stage pill ──────────────────────────────────────────────────── */
function StagePill({ stage, count }: { stage: number; count: number }) {
  if (count === 0) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 3,
        fontFamily: "var(--mono)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.08em",
        background: `${STAGE_COLORS[stage]}18`,
        color: STAGE_COLORS[stage],
        border: `1px solid ${STAGE_COLORS[stage]}30`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: STAGE_COLORS[stage],
          flexShrink: 0,
        }}
      />
      {count} {STAGE_LABELS[stage]?.toUpperCase()}
    </span>
  );
}

/* ─── main gallery view ───────────────────────────────────────────── */
export default function GalleryView() {
  const [items, setItems] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const heatmap = await getHeatmapData();
      const points = heatmap.data_points ?? [];
      setItems(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gallery data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── sorting ─────────────────────────────────────────────────────── */
  const sorted = [...items].sort((a, b) => {
    switch (sortKey) {
      case "date-desc":
        return new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime();
      case "date-asc":
        return new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime();
      case "features-desc":
        return getFlowerCount(b) - getFlowerCount(a);
      case "features-asc":
        return getFlowerCount(a) - getFlowerCount(b);
      default:
        return 0;
    }
  });

  /* ── aggregate stats ─────────────────────────────────────────────── */
  const totalImages = items.length;
  const aggStages: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  items.forEach((item) => {
    const sc = getStageCounts(item);
    aggStages[0] += sc[0];
    aggStages[1] += sc[1];
    aggStages[2] += sc[2];
  });
  const uniqueLocations = new Set(
    items
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => `${d.latitude!.toFixed(4)},${d.longitude!.toFixed(4)}`)
  ).size;

  /* ── lightbox helpers ────────────────────────────────────────────── */
  const allIds = sorted.map((d) => d.id);

  const openLightbox = useCallback(
    (id: string) => {
      const idx = allIds.indexOf(id);
      if (idx >= 0) setLightbox({ ids: allIds, index: idx });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted]
  );

  /* ── render ──────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Loader2 size={16} className="pulse" color="var(--green)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-dim)" }}>
            Loading gallery...
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 320, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-up">
        <div
          style={{
            background: "var(--orange-muted)",
            border: "1px solid #4a2010",
            borderRadius: 6,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={14} color="var(--orange)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--orange)" }}>{error}</span>
          <button
            onClick={fetchAll}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid var(--orange)",
              borderRadius: 4,
              padding: "4px 12px",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--orange)",
              cursor: "pointer",
            }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--mono)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            Gallery
          </h1>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)", margin: "4px 0 0" }}>
            {totalImages} image{totalImages !== 1 ? "s" : ""} captured
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={fetchAll}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-dim)",
            }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── aggregate stats bar ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {([0, 1, 2] as const).map((stage) => (
          <div key={stage} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: `${STAGE_COLORS[stage]}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Flower2 size={15} color={STAGE_COLORS[stage]} />
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20 }}>{aggStages[stage]}</div>
              <div className="stat-label">{STAGE_LABELS[stage]}</div>
            </div>
          </div>
        ))}
        <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "var(--green-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MapPin size={15} color="var(--green)" />
          </div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>{uniqueLocations}</div>
            <div className="stat-label">Locations</div>
          </div>
        </div>
      </div>

      {/* ── sort control ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <p style={sectionLabel}>All Captures</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ArrowUpDown size={11} color="var(--text-faint)" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "5px 10px",
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.06em",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── gallery grid ────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--text-faint)",
          }}
        >
          <ImageIcon size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <br />
          No images yet. Classify some photos to populate the gallery.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {sorted.map((item) => {
            const sc = getStageCounts(item);
            const flowerCount = getFlowerCount(item);
            const ts = item.timestamp ? new Date(item.timestamp) : null;
            const dateStr = ts
              ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—";
            const timeStr = ts
              ? ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
              : "";

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                {/* Image */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden" }}>
                  <Thumbnail
                    id={item.id}
                    onClick={() => openLightbox(item.id)}
                    style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.7)",
                      backdropFilter: "blur(4px)",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Flower2 size={10} />
                    {flowerCount}
                  </div>
                </div>

                {/* Info panel */}
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{dateStr}{timeStr ? ` · ${timeStr}` : ""}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    <StagePill stage={0} count={sc[0]} />
                    <StagePill stage={1} count={sc[1]} />
                    <StagePill stage={2} count={sc[2]} />
                  </div>

                  {item.latitude != null && item.longitude != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: "var(--text-faint)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      <MapPin size={10} />
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── lightbox ────────────────────────────────────────────────── */}
      {lightbox && (
        <ImageLightbox
          ids={lightbox.ids}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={(idx) => setLightbox((prev) => (prev ? { ...prev, index: idx } : null))}
        />
      )}
    </div>
  );
}
