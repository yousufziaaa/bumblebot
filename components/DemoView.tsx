"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Timer,
} from "lucide-react";
import {
  classifyImage,
  ClassificationResult,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/api";

/* ─── small animated reveal card ─────────────────────────────────── */
function RevealCard({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      className="fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

/* ─── stage colours / labels already in lib/api — re-export locally  */
const STAGE_LONG: Record<number, string> = {
  0: "Bud",
  1: "Anthesis",
  2: "Post-Anthesis",
};

export default function DemoView() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBboxes, setShowBboxes] = useState(true);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── file handling ───────────────────────────────────────────────── */
  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setElapsed(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── classify ────────────────────────────────────────────────────── */
  const classify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      const data = await classifyImage(file);
      setElapsed(Date.now() - t0);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setElapsed(null);
  };

  /* ── derived stats ───────────────────────────────────────────────── */
  const stageCounts =
    result?.flowers.reduce(
      (acc, f) => {
        acc[f.stage] = (acc[f.stage] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    ) ?? {};

  const avgConf =
    result && result.flowers.length > 0
      ? result.flowers.reduce((a, f) => a + f.confidence, 0) /
        result.flowers.length
      : null;

  /* ── section label style ─────────────────────────────────────────── */
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 10,
    color: "var(--text-faint)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 12,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ════════════════════════════════════════ LEFT COLUMN ══════════ */}
      <div
        style={{
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header strip */}
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="tag tag-orange">DEMO MODE</span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              BumbleBot Classifier
            </span>
          </div>
          {file && (
            <button
              onClick={reset}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "5px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--text-faint)",
              }}
            >
              <X size={12} />
              RESET
            </button>
          )}
        </div>

        {/* Image area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {!preview ? (
            /* ── Drop zone ── */
            <div
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                cursor: "pointer",
                borderRadius: 0,
                border: "none",
                borderTop: "none",
              }}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: "var(--green-muted)",
                  border: "1px solid #1e3e1e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Upload size={32} color="var(--green)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  Drop image here
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--text-faint)",
                  }}
                >
                  or click to browse · JPG · PNG · WEBP
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  e.target.files?.[0] && handleFile(e.target.files[0])
                }
              />
            </div>
          ) : (
            /* ── Image + bbox overlay ── */
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background: "#000",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Capture"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />

              {/* SVG bbox overlay */}
              {result && showBboxes && result.flowers.length > 0 && (
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {result.flowers.map((flower, i) => {
                    const [x, y, w, h] = flower.bounding_box;
                    const color = STAGE_COLORS[flower.stage] || "#22c55e";
                    return (
                      <g key={i}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="none"
                          stroke={color}
                          strokeWidth="0.6"
                          opacity="0.95"
                        />
                        <rect
                          x={x}
                          y={Math.max(0, y - 5)}
                          width={Math.min(w, 18)}
                          height="5"
                          fill={color}
                          opacity="0.9"
                        />
                        <text
                          x={x + 0.6}
                          y={Math.max(4, y - 0.5)}
                          fontSize="3"
                          fill="#000"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {STAGE_LONG[flower.stage]?.charAt(0)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Controls overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  display: "flex",
                  gap: 8,
                }}
              >
                {result && (
                  <button
                    onClick={() => setShowBboxes((v) => !v)}
                    style={{
                      background: showBboxes
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(8,14,8,0.9)",
                      border: `1px solid ${showBboxes ? "#22c55e" : "var(--border-2)"}`,
                      borderRadius: 4,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: showBboxes ? "var(--green)" : "var(--text-dim)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    BBOX {showBboxes ? "ON" : "OFF"}
                  </button>
                )}
              </div>

              {/* File name badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: 14,
                  background: "rgba(8,14,8,0.88)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 4,
                  padding: "5px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-dim)",
                }}
              >
                {file?.name}
              </div>
            </div>
          )}
        </div>

        {/* Classify button */}
        {file && !result && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={classify}
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "var(--green-muted)" : "var(--green)",
                color: loading ? "var(--green)" : "#000",
                border: "none",
                borderRadius: 6,
                padding: "16px 24px",
                fontFamily: "var(--mono)",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.1em",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {loading ? "ANALYZING..." : "RUN CLASSIFICATION"}
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════ RIGHT COLUMN ═════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header strip */}
        <div
          style={{
            padding: "18px 28px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-faint)",
              letterSpacing: "0.08em",
            }}
          >
            RESULTS
          </span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 36px",
          }}
        >
          {/* ── Idle state ── */}
          {!file && !loading && !result && !error && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  color: "var(--text-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                AWAITING IMAGE
              </div>
              <div
                style={{ width: 40, height: 1, background: "var(--border-2)" }}
              />
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-faint)",
                }}
              >
                Upload an image on the left to begin
              </div>
            </div>
          )}

          {/* ── Ready to classify ── */}
          {file && !loading && !result && !error && (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  color: "var(--text-faint)",
                  letterSpacing: "0.1em",
                }}
              >
                IMAGE LOADED
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-faint)",
                }}
              >
                Press &ldquo;RUN CLASSIFICATION&rdquo; to continue
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
              }}
            >
              <div
                className="pulse"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 32,
                  fontWeight: 600,
                  color: "var(--green)",
                  letterSpacing: "0.15em",
                }}
              >
                ANALYZING...
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="pulse"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "var(--green)",
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-faint)",
                }}
              >
                Running CV model on image...
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "var(--orange-muted)",
                  border: "1px solid #4a2010",
                  borderRadius: 8,
                  padding: "20px 24px",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <AlertCircle
                  size={20}
                  color="var(--orange)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 13,
                      color: "var(--orange)",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    CLASSIFICATION FAILED
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--orange)",
                      opacity: 0.8,
                    }}
                  >
                    {error}
                  </div>
                </div>
              </div>
              <button
                onClick={classify}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "12px",
                  cursor: "pointer",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-dim)",
                  letterSpacing: "0.08em",
                }}
              >
                RETRY
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* 1. Status banner */}
              <RevealCard delay={0}>
                <div
                  style={{
                    background: "var(--green-muted)",
                    border: "1px solid #1e3e1e",
                    borderRadius: 8,
                    padding: "16px 22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <CheckCircle2 size={20} color="var(--green)" />
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 14,
                        color: "var(--green)",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                      }}
                    >
                      CLASSIFICATION COMPLETE
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      color: "var(--text-faint)",
                    }}
                  >
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </RevealCard>

              {/* 2. Hero flower count */}
              <RevealCard delay={150}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "28px 32px",
                  }}
                >
                  <div style={sectionLabel}>TOTAL FLOWERS DETECTED</div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 72,
                      fontWeight: 600,
                      color: "var(--green)",
                      lineHeight: 1,
                    }}
                  >
                    {result.flower_count}
                  </div>
                </div>
              </RevealCard>

              {/* 3. Stage breakdown */}
              <RevealCard delay={300}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "20px 24px",
                  }}
                >
                  <div style={sectionLabel}>STAGE BREAKDOWN</div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {[0, 1, 2].map((stage) => {
                      const count = stageCounts[stage] || 0;
                      const pct =
                        result.flower_count > 0
                          ? count / result.flower_count
                          : 0;
                      const color = STAGE_COLORS[stage];
                      return (
                        <div key={stage}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 7,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: color,
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: "var(--mono)",
                                  fontSize: 13,
                                  color: "var(--text)",
                                }}
                              >
                                {STAGE_LABELS[stage]}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--mono)",
                                  fontSize: 12,
                                  color: "var(--text-dim)",
                                }}
                              >
                                {(pct * 100).toFixed(0)}%
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--mono)",
                                  fontSize: 20,
                                  fontWeight: 600,
                                  color,
                                  minWidth: 32,
                                  textAlign: "right",
                                }}
                              >
                                {count}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              height: 5,
                              background: "var(--border)",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct * 100}%`,
                                background: color,
                                borderRadius: 3,
                                transition:
                                  "width 1s cubic-bezier(0.4,0,0.2,1)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </RevealCard>

              {/* 4. Avg confidence */}
              <RevealCard delay={450}>
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ ...sectionLabel, marginBottom: 0 }}>
                    AVG CONFIDENCE
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 36,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {avgConf !== null ? `${(avgConf * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
              </RevealCard>

              {/* 5. Processing time */}
              {elapsed !== null && (
                <RevealCard delay={600}>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "14px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Timer size={14} color="var(--text-faint)" />
                    <span style={{ ...sectionLabel, marginBottom: 0 }}>
                      PROCESSED IN
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--text-dim)",
                        marginLeft: "auto",
                      }}
                    >
                      {(elapsed / 1000).toFixed(2)}s
                    </span>
                  </div>
                </RevealCard>
              )}

              {/* 6. GPS (only if non-zero) */}
              {result &&
                result.location &&
                result.location.latitude != null &&
                result.location.longitude != null &&
                (result.location.latitude !== 0 ||
                  result.location.longitude !== 0) && (
                <RevealCard delay={750}>
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "14px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <MapPin size={14} color="var(--text-faint)" />
                    <span style={{ ...sectionLabel, marginBottom: 0 }}>
                      GPS
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 13,
                        color: "var(--text-dim)",
                        marginLeft: "auto",
                      }}
                    >
                      {result.location.latitude.toFixed(5)},{" "}
                      {result.location.longitude.toFixed(5)}
                    </span>
                  </div>
                </RevealCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
