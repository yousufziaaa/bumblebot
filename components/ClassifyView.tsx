"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, ImageIcon, MapPin } from "lucide-react";
import { classifyImage, ClassificationResult, STAGE_LABELS, STAGE_COLORS } from "@/lib/api";

export default function ClassifyView() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBboxes, setShowBboxes] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const classify = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await classifyImage(file);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classification failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

  // Count flowers per stage
  const stageCounts = result
    ? result.flowers.reduce((acc, f) => {
        acc[f.stage] = (acc[f.stage] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    : {};

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span className="tag tag-green">CLASSIFY</span>
        </div>
        <h1 style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, color: "var(--text)", margin: 0 }}>
          Image Classification
        </h1>
        <p style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13 }}>
          Upload a tomato plant image to detect flowers and classify their growth stage.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: upload / preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!preview ? (
            <div
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              style={{ borderRadius: 8, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "pointer", minHeight: 300 }}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <div style={{ width: 52, height: 52, borderRadius: 8, background: "var(--green-muted)", border: "1px solid #1e3e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={22} color="var(--green)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", fontWeight: 500 }}>Drop image here</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>or click to browse</div>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.05em" }}>JPG · PNG · WEBP</div>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              {/* Image with bbox overlay */}
              <div style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" style={{ width: "100%", display: "block", maxHeight: 340, objectFit: "contain" }} />

                {/* Bounding box overlay */}
                {result && showBboxes && result.flowers.length > 0 && (
                  <svg
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {result.flowers.map((flower, i) => {
                      const [x, y, w, h] = flower.bounding_box;
                      const color = STAGE_COLORS[flower.stage] || "#22c55e";
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="0.5" opacity="0.9" />
                          <rect x={x} y={y - 4} width={Math.min(w, 16)} height="4" fill={color} opacity="0.85" />
                          <text x={x + 0.5} y={y - 0.5} fontSize="2.5" fill="#000" fontFamily="monospace" fontWeight="bold">
                            {STAGE_LABELS[flower.stage]?.charAt(0)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>

              {/* Controls */}
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                {result && (
                  <button
                    onClick={() => setShowBboxes((v) => !v)}
                    style={{ background: showBboxes ? "rgba(34,197,94,0.2)" : "rgba(8,14,8,0.85)", border: `1px solid ${showBboxes ? "#22c55e" : "var(--border-2)"}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 9, color: showBboxes ? "var(--green)" : "var(--text-dim)", letterSpacing: "0.08em" }}
                  >
                    BBOX {showBboxes ? "ON" : "OFF"}
                  </button>
                )}
                <button onClick={reset} style={{ background: "rgba(8,14,8,0.85)", border: "1px solid var(--border-2)", borderRadius: 4, padding: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <X size={14} color="var(--text-dim)" />
                </button>
              </div>

              <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(8,14,8,0.85)", border: "1px solid var(--border-2)", borderRadius: 4, padding: "4px 10px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)" }}>
                {file?.name}
              </div>
            </div>
          )}

          {file && !result && (
            <button
              onClick={classify}
              disabled={loading}
              style={{ background: loading ? "var(--green-muted)" : "var(--green)", color: loading ? "var(--green)" : "#000", border: "none", borderRadius: 6, padding: "12px 24px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s ease" }}
            >
              {loading ? (<><Loader2 size={14} className="pulse" />ANALYZING...</>) : (<><ImageIcon size={14} />RUN CLASSIFICATION</>)}
            </button>
          )}

          {error && (
            <div style={{ background: "var(--orange-muted)", border: "1px solid #4a2010", borderRadius: 6, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertCircle size={14} color="var(--orange)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--orange)" }}>{error}</span>
            </div>
          )}
        </div>

        {/* Right: results */}
        <div>
          {!result && !loading && (
            <div style={{ height: "100%", minHeight: 300, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.08em" }}>AWAITING INPUT</div>
              <div style={{ width: 32, height: 1, background: "var(--border-2)" }} />
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>Results will appear here</div>
            </div>
          )}

          {loading && (
            <div style={{ height: "100%", minHeight: 300, background: "var(--surface)", border: "1px solid #1e3e1e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
              <div className="pulse" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--green)", letterSpacing: "0.12em" }}>PROCESSING</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          {result && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Success banner */}
              <div style={{ background: "var(--green-muted)", border: "1px solid #1e3e1e", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={16} color="var(--green)" />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--green)", fontWeight: 500 }}>CLASSIFICATION COMPLETE</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>

              {/* Flower count hero */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: 6 }}>TOTAL FLOWERS DETECTED</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 48, fontWeight: 600, color: "var(--green)", lineHeight: 1 }}>{result.flower_count}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: 4 }}>AVG CONFIDENCE</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
                      {result.flowers.length > 0
                        ? `${(result.flowers.reduce((a, f) => a + f.confidence, 0) / result.flowers.length * 100).toFixed(0)}%`
                        : "—"
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage breakdown */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 20px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: 14 }}>STAGE BREAKDOWN</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[0, 1, 2].map((stage) => {
                    const count = stageCounts[stage] || 0;
                    const pct = result.flower_count > 0 ? count / result.flower_count : 0;
                    const color = STAGE_COLORS[stage];
                    return (
                      <div key={stage}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text)" }}>{STAGE_LABELS[stage]}</span>
                          </div>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>{(pct * 100).toFixed(0)}%</span>
                            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color }}>
                              {count}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: color, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              {result &&
                result.location &&
                result.location.latitude != null &&
                result.location.longitude != null &&
                (result.location.latitude !== 0 || result.location.longitude !== 0) && (
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <MapPin size={13} color="var(--text-faint)" />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
                      {result.location.latitude.toFixed(5)}, {result.location.longitude.toFixed(5)}
                    </span>
                  </div>
                )}

              {/* Record ID */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 16px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: 4 }}>RECORD ID</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)", wordBreak: "break-all" }}>{result.id}</div>
              </div>

              {/* Raw toggle */}
              <details style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 16px" }}>
                <summary style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em", cursor: "pointer" }}>RAW RESPONSE</summary>
                <pre style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)", marginTop: 10, overflow: "auto", maxHeight: 200 }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
