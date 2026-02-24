"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw, Loader2, AlertCircle, ImageIcon } from "lucide-react";
import {
  getHeatmapData,
  listVideoClassifications,
  getClassification,
  HeatmapData,
  VideoClassification,
  ClassificationResult,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/api";

/* ─── helpers ─────────────────────────────────────────────────────── */
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

function SectionError({ msg }: { msg: string }) {
  return (
    <div
      style={{
        background: "var(--orange-muted)",
        border: "1px solid #4a2010",
        borderRadius: 6,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <AlertCircle size={13} color="var(--orange)" style={{ flexShrink: 0 }} />
      <span
        style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--orange)" }}
      >
        {msg}
      </span>
    </div>
  );
}

function SkeletonBlock({ h = 120 }: { h?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, borderRadius: 6, width: "100%" }}
    />
  );
}

/* ─── heatmap colour (same logic as old DashboardView) ───────────── */
function heatColor(count: number, max: number) {
  const r = max > 0 ? count / max : 0;
  if (r > 0.75) return { bg: "rgba(249,115,22,0.6)", border: "#f97316" };
  if (r > 0.5)  return { bg: "rgba(234,179,8,0.4)",  border: "#eab308" };
  if (r > 0.25) return { bg: "rgba(34,197,94,0.35)", border: "#22c55e" };
  return { bg: "rgba(34,197,94,0.1)", border: "#1e3e1e" };
}

/* ─── thumbnail with fallback ─────────────────────────────────────── */
function Thumbnail({ id, style }: { id: string; style?: React.CSSProperties }) {
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
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
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
          flexShrink: 0,
        }}
      >
        <ImageIcon size={22} color="var(--text-faint)" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={id} style={{ ...style, objectFit: "cover", flexShrink: 0 }} />
  );
}

/* ─── types ───────────────────────────────────────────────────────── */
interface DashData {
  records: VideoClassification[];
  details: ClassificationResult[];
  heatmap: HeatmapData | null;
}

export default function DashboardView() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── fetch all data ─────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const errs: Record<string, string> = {};

    // 1. video-classifications list
    let records: VideoClassification[] = [];
    try {
      records = await listVideoClassifications();
      if (!Array.isArray(records)) records = [];
    } catch (e) {
      errs.records = e instanceof Error ? e.message : "Failed to load records";
    }

    // 2. fetch details for up to 20 most recent records
    let details: ClassificationResult[] = [];
    if (records.length > 0) {
      const recent = records.slice(-20);
      const settled = await Promise.allSettled(
        recent.map((r) => getClassification(r.record_id))
      );
      details = settled
        .filter((s): s is PromiseFulfilledResult<ClassificationResult> => s.status === "fulfilled")
        .map((s) => s.value);
      if (details.length === 0 && settled.length > 0) {
        errs.details = "Could not load classification details";
      }
    }

    // 3. heatmap
    let heatmap: HeatmapData | null = null;
    try {
      heatmap = await getHeatmapData();
    } catch (e) {
      errs.heatmap = e instanceof Error ? e.message : "Failed to load heatmap";
    }

    setData({ records, details, heatmap });
    setErrors(errs);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAll]);

  /* ── derived stats ──────────────────────────────────────────────── */
  const allFlowers = data?.details.flatMap((d) => d.flowers) ?? [];
  const totalFlowers = allFlowers.length;
  const imagesProcessed = data?.details.length ?? 0;
  const avgConf =
    totalFlowers > 0
      ? allFlowers.reduce((a, f) => a + f.confidence, 0) / totalFlowers
      : null;

  const timestamps = data?.details
    .map((d) => new Date(d.timestamp).getTime())
    .filter(Boolean)
    .sort((a, b) => a - b) ?? [];
  const sessionDuration =
    timestamps.length >= 2
      ? Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 60_000)
      : null;

  /* ── stage counts for donut ─────────────────────────────────────── */
  const stageCounts = [0, 1, 2].map((stage) => ({
    name: STAGE_LABELS[stage],
    value: allFlowers.filter((f) => f.stage === stage).length,
    color: STAGE_COLORS[stage],
  }));
  const donutTotal = stageCounts.reduce((a, b) => a + b.value, 0);

  /* ── row heatmap — 6 buckets by timestamp ──────────────────────── */
  const sortedDetails = [...(data?.details ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const rowBuckets: { label: string; count: number }[] = Array.from(
    { length: 6 },
    (_, i) => ({ label: `Row ${i + 1}`, count: 0 })
  );
  if (sortedDetails.length > 0) {
    sortedDetails.forEach((d, i) => {
      const bucket = Math.min(
        Math.floor((i / sortedDetails.length) * 6),
        5
      );
      rowBuckets[bucket].count += d.flower_count;
    });
  }
  const maxRowCount = Math.max(...rowBuckets.map((r) => r.count), 1);

  /* ── timeline data ──────────────────────────────────────────────── */
  const timelineData = sortedDetails.map((d, i) => ({
    idx: i + 1,
    flowers: d.flower_count,
    confidence:
      d.flowers.length > 0
        ? Math.round(
            (d.flowers.reduce((a, f) => a + f.confidence, 0) / d.flowers.length) * 100
          )
        : 0,
  }));

  /* ── recent 8 captures ──────────────────────────────────────────── */
  const recentCaptures = sortedDetails.slice(-8).reverse();

  /* ── dominant stage for a capture ──────────────────────────────── */
  function dominantStage(d: ClassificationResult): number | null {
    if (d.flowers.length === 0) return null;
    const counts = d.flowers.reduce(
      (acc, f) => { acc[f.stage] = (acc[f.stage] || 0) + 1; return acc; },
      {} as Record<number, number>
    );
    return parseInt(
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    );
  }

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}
          >
            <span className="tag tag-green">DASHBOARD</span>
            {lastUpdated && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--text-faint)",
                }}
              >
                Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 30s
              </span>
            )}
          </div>
          <h1
            style={{
              fontFamily: "var(--mono)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text)",
              margin: 0,
            }}
          >
            Yield Overview
          </h1>
          <p style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13 }}>
            Aggregated analytics from the latest greenhouse walk.
          </p>
        </div>
        <button
          onClick={fetchAll}
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

      {/* ── Session stats bar ───────────────────────────────────────── */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} h={80} />)}
        </div>
      ) : (
        <div
          className="fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            { label: "TOTAL FLOWERS", value: totalFlowers },
            { label: "IMAGES PROCESSED", value: imagesProcessed },
            {
              label: "AVG CONFIDENCE",
              value: avgConf !== null ? `${(avgConf * 100).toFixed(1)}%` : "—",
            },
            {
              label: "SESSION DURATION",
              value:
                sessionDuration !== null ? `${sessionDuration}m` : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="stat-card">
              <div className="stat-value">{String(value)}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Middle row ──────────────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}
      >
        {/* Left: Donut chart */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <div style={sectionLabel}>STAGE DISTRIBUTION</div>
          {loading ? (
            <SkeletonBlock h={220} />
          ) : errors.records ? (
            <SectionError msg={errors.records} />
          ) : donutTotal === 0 ? (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--text-faint)",
                letterSpacing: "0.08em",
              }}
            >
              NO FLOWER DATA
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stageCounts}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stageCounts.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--text)",
                    }}
                    formatter={(val: number | undefined) => [val ?? 0, ""] as [number, string]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Mini stage cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {stageCounts.map((s) => {
                  const pct = donutTotal > 0 ? s.value / donutTotal : 0;
                  return (
                    <div
                      key={s.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        background: "var(--surface-2)",
                        borderRadius: 5,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: s.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          color: "var(--text)",
                          flex: 1,
                        }}
                      >
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          color: "var(--text-dim)",
                        }}
                      >
                        {(pct * 100).toFixed(0)}%
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: s.color,
                          minWidth: 28,
                          textAlign: "right",
                        }}
                      >
                        {s.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Row heatmap */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <div style={sectionLabel}>GREENHOUSE ROW HEATMAP</div>
          {loading ? (
            <SkeletonBlock h={300} />
          ) : errors.records ? (
            <SectionError msg={errors.records} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {rowBuckets.map((row) => {
                const c = heatColor(row.count, maxRowCount);
                return (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--text-faint)",
                        width: 38,
                        flexShrink: 0,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {row.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 36,
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {row.count}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 8,
                  justifyContent: "flex-end",
                }}
              >
                {[
                  { label: "LOW",  bg: "rgba(34,197,94,0.1)",   border: "#1e3e1e" },
                  { label: "MED",  bg: "rgba(234,179,8,0.4)",   border: "#eab308" },
                  { label: "HIGH", bg: "rgba(249,115,22,0.6)",  border: "#f97316" },
                ].map(({ label, bg, border }) => (
                  <div
                    key={label}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: bg,
                        border: `1px solid ${border}`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        color: "var(--text-faint)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Capture Timeline ─────────────────────────────────────────── */}
      {(loading || timelineData.length > 0) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={sectionLabel}>CAPTURE TIMELINE</div>
          {loading ? (
            <SkeletonBlock h={180} />
          ) : errors.details ? (
            <SectionError msg={errors.details} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={timelineData}
                margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="idx"
                  tick={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    fill: "var(--text-faint)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "IMAGE",
                    position: "insideBottomRight",
                    offset: 0,
                    style: {
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      fill: "var(--text-faint)",
                    },
                  }}
                />
                <YAxis
                  tick={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    fill: "var(--text-faint)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--text)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="flowers"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Flowers"
                  activeDot={{ r: 4, fill: "#22c55e" }}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#3d5c3d"
                  strokeWidth={1.5}
                  dot={false}
                  name="Conf %"
                  activeDot={{ r: 3, fill: "#3d5c3d" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Recent Captures Strip ─────────────────────────────────────── */}
      {(loading || recentCaptures.length > 0) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={sectionLabel}>RECENT CAPTURES</div>
          {loading ? (
            <div style={{ display: "flex", gap: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} h={110} />
              ))}
            </div>
          ) : errors.details ? (
            <SectionError msg={errors.details} />
          ) : (
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
              }}
            >
              {recentCaptures.map((capture, i) => {
                const dom = dominantStage(capture);
                const tagClass =
                  dom === 0
                    ? "tag tag-green"
                    : dom === 1
                    ? "tag tag-orange"
                    : "tag tag-dim";
                return (
                  <div
                    key={capture.id}
                    className="fade-up"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      animationFillMode: "both",
                      flexShrink: 0,
                      width: 140,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <Thumbnail
                      id={capture.id}
                      style={{ width: 140, height: 90, borderRadius: 0 }}
                    />
                    <div style={{ padding: "8px 10px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {capture.flower_count}
                        </span>
                        {dom !== null && (
                          <span className={tagClass}>
                            {STAGE_LABELS[dom]?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 9,
                          color: "var(--text-faint)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(capture.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spatial heatmap (from /api/heatmap-data) */}
      {!loading && data?.heatmap && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <div style={sectionLabel}>SPATIAL HEATMAP</div>
          {errors.heatmap ? (
            <SectionError msg={errors.heatmap} />
          ) : data.heatmap.zones && data.heatmap.zones.length > 0 ? (
            <>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 280,
                  background: "var(--bg)",
                  borderRadius: 6,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                    backgroundSize: "25% 25%",
                    opacity: 0.5,
                  }}
                />
                {(() => {
                  const maxZ = Math.max(
                    ...data.heatmap.zones!.map((z) => z.count),
                    1
                  );
                  return data.heatmap.zones!.map((zone) => {
                    const c = heatColor(zone.count, maxZ);
                    return (
                      <div
                        key={zone.id}
                        title={`${zone.label}: ${zone.count}`}
                        style={{
                          position: "absolute",
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.width}%`,
                          height: `${zone.height}%`,
                          background: c.bg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 4,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {zone.count}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 9,
                            color: "var(--text-dim)",
                            marginTop: 2,
                          }}
                        >
                          {zone.label}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div
              style={{
                height: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--text-faint)",
                letterSpacing: "0.08em",
              }}
            >
              NO ZONE DATA
            </div>
          )}
        </div>
      )}
    </div>
  );
}
