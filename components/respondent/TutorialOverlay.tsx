"use client";
import { useEffect, useState } from "react";

// ── Generic overlay shell ─────────────────────────────────────────────────────

interface TutorialOverlayProps {
  title:     string;
  body:      string;
  demo:      React.ReactNode;
  onDismiss: () => void;
}

export function TutorialOverlay({ title, body, demo, onDismiss }: TutorialOverlayProps) {
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(12, 14, 22, 0.58)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex:         300,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "24px",
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "#fff",
          borderRadius: 20,
          padding:      "30px 28px 24px",
          maxWidth:     460,
          width:        "100%",
          boxShadow:    "0 28px 80px rgba(0,0,0,0.22)",
          animation:    "card-enter 0.2s ease both",
        }}
      >
        {/* label */}
        <div style={{
          fontSize:      10.5,
          fontWeight:    600,
          letterSpacing: "0.1em",
          color:         "var(--text-3)",
          fontFamily:    "'Fira Code', monospace",
          marginBottom:  7,
        }}>
          HOW THIS WORKS
        </div>

        {/* title */}
        <h3 className="font-display" style={{
          fontSize:     20,
          fontWeight:   700,
          color:        "var(--ink)",
          marginBottom: 6,
          lineHeight:   1.2,
        }}>
          {title}
        </h3>

        {/* body */}
        <p style={{
          fontSize:     13,
          color:        "var(--text-2)",
          lineHeight:   1.7,
          marginBottom: 20,
        }}>
          {body}
        </p>

        {/* animated demo area */}
        <div style={{
          background:   "var(--bg)",
          border:       "1px solid var(--line)",
          borderRadius: 14,
          padding:      "18px 16px 14px",
          marginBottom: 20,
          overflow:     "hidden",
          minHeight:    130,
          userSelect:   "none",
        }}>
          {demo}
        </div>

        {/* CTA */}
        <button
          onClick={onDismiss}
          className="btn btn-primary"
          style={{ width: "100%", fontSize: 13.5, padding: "12px 20px" }}
        >
          Got it — let's go →
        </button>

        <div style={{
          marginTop:  10,
          textAlign:  "center",
          fontSize:   10.5,
          color:      "var(--text-3)",
          fontFamily: "'Sora', sans-serif",
        }}>
          or click anywhere outside to close
        </div>
      </div>
    </div>
  );
}

// ── Clustering demo ───────────────────────────────────────────────────────────
//
// Mirrors the paint-mode flow exactly:
//   0        — palette shown, Group A active, all cards unpainted
//   1        — card 0 painted blue (Group A)
//   2        — card 1 painted blue
//   3        — Group B becomes active brush
//   4        — card 2 painted green (Group B)
//   5        — card 3 painted green
//   6        — all painted; "All sorted ✓" appears
//   7        — Phase 2 preview: only Group A cards, star lands on card 0
//   → loop

const DEMO_CARDS = ["Neurobiology", "Cognition", "Statistics", "Ethics"];
const GRP_A = "#3b82f6";
const GRP_B = "#10b981";

export function ClusteringDemo() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 8), 1000);
    return () => clearInterval(id);
  }, []);

  // Which group each card belongs to
  const cardColor = [
    frame >= 1 ? GRP_A : null,
    frame >= 2 ? GRP_A : null,
    frame >= 4 ? GRP_B : null,
    frame >= 5 ? GRP_B : null,
  ];

  const activeColor  = frame <= 2 ? GRP_A : GRP_B;
  const activeLabel  = frame <= 2 ? "A" : "B";
  const allDone      = frame >= 6;
  const isAnchorPhase = frame === 7;

  return (
    <div>

      {/* ── Palette row (mirrors the real toolbar) ── */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        gap:           6,
        paddingBottom: 10,
        marginBottom:  10,
        borderBottom:  "1px solid #e5e7eb",
      }}>
        {[{ label: "A", color: GRP_A }, { label: "B", color: GRP_B }].map(({ label, color }) => {
          const isActive = !isAnchorPhase && label === activeLabel;
          const cnt = cardColor.filter((c) => c === color).length;
          return (
            <div key={label} style={{
              display:      "flex",
              alignItems:   "center",
              gap:          5,
              padding:      "5px 10px 5px 7px",
              borderRadius: 20,
              border:       `${isActive ? 2 : 1}px solid ${isActive ? color : "transparent"}`,
              background:   isActive ? `${color}16` : `${color}0a`,
              transition:   "all 0.35s ease",
            }}>
              <div style={{
                width:        isActive ? 10 : 8,
                height:       isActive ? 10 : 8,
                borderRadius: "50%",
                background:   color,
                boxShadow:    isActive ? `0 0 0 2px ${color}28` : "none",
                transition:   "all 0.35s",
              }} />
              {cnt > 0 && (
                <span style={{
                  fontSize: 9.5, fontFamily: "'Fira Code', monospace",
                  color: isActive ? color : `${color}80`,
                }}>
                  {cnt}
                </span>
              )}
            </div>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {allDone && (
            <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, fontFamily: "'Sora', sans-serif" }}>
              All sorted ✓
            </span>
          )}
          <span style={{ fontSize: 9.5, color: "#9ca3af", fontFamily: "'Fira Code', monospace" }}>
            {cardColor.filter(Boolean).length} / {DEMO_CARDS.length}
          </span>
        </div>
      </div>

      {/* ── Hint line ── */}
      {!isAnchorPhase && (
        <div style={{
          fontSize: 10, color: "#9ca3af", fontFamily: "'Sora', sans-serif",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 5,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: activeColor,
            boxShadow: `0 0 0 2px ${activeColor}30`,
          }} />
          Painting with this colour
        </div>
      )}

      {/* ── Card grid (stable — cards never move) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {DEMO_CARDS.map((label, i) => {
          const color   = cardColor[i];
          const painted = color != null;

          // Phase 2: only show Group A cards
          if (isAnchorPhase && color !== GRP_A) return null;

          const isStar = isAnchorPhase && i === 0;

          return (
            <div key={label} style={{
              position:     "relative",
              padding:      "7px 10px",
              borderRadius: 7,
              border:       `1.5px solid ${painted ? `${color}50` : "#e5e7eb"}`,
              borderLeft:   painted ? `3px solid ${color}` : "1.5px solid #e5e7eb",
              background:   painted ? `${color}0d` : "#fff",
              transition:   "all 0.4s ease",
            }}>
              {painted && (
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: color, marginBottom: 3,
                }} />
              )}
              <span style={{ fontSize: 10, fontWeight: 600, color: "#1f2937", fontFamily: "'Sora', sans-serif" }}>
                {label}
              </span>
              {isStar && (
                <span style={{
                  position: "absolute", top: 6, right: 8,
                  fontSize: 12, color: GRP_A,
                  animation: "card-enter 0.2s ease both",
                }}>
                  ★
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Caption ── */}
      <div style={{
        marginTop: 10, fontSize: 9.5, color: "#9ca3af",
        fontFamily: "'Fira Code', monospace", textAlign: "center", minHeight: 13,
      }}>
        {frame === 0 && "pick a group  →  click concepts to paint them"}
        {frame === 1 && "concept painted into Group A"}
        {frame === 2 && "another concept painted into Group A"}
        {frame === 3 && "switch brush to Group B"}
        {frame === 4 && "concept painted into Group B"}
        {frame === 5 && "all concepts painted — two groups used"}
        {frame === 6 && "ready to pick anchors"}
        {frame === 7 && "step 2: which concept anchors each group?  ★"}
      </div>
    </div>
  );
}

// ── Edge creation demo ────────────────────────────────────────────────────────
//
// 6 frames mirroring the new focus-mode grid:
//   0  idle — grouped grid, nothing selected
//   1  "Neurobiology" focused — dark banner appears, grid shows others
//   2  "Cognition" expanded — inline picker shown
//   3  "Moderate" chosen — connection saved, picker collapses
//   4  "Statistics" expanded — second connection
//   5  "Strong" saved — 2 connections total, idle view

export function EdgeCreationDemo() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 6), 1350);
    return () => clearInterval(id);
  }, []);

  const focused        = frame >= 1;
  const cogExpanded    = frame === 2;
  const cogConnected   = frame >= 3;
  const statExpanded   = frame === 4;
  const statConnected  = frame >= 5;

  const concepts = [
    { name: "Cognition",  connected: cogConnected,  expanded: cogExpanded,  color: "#10b981", strength: "Moderate", h: 3.5 },
    { name: "Statistics", connected: statConnected, expanded: statExpanded, color: "#f59e0b", strength: "Strong",   h: 5.5 },
    { name: "Ethics",     connected: false,          expanded: false,        color: null,      strength: null,       h: 0 },
  ];

  const connCount = (cogConnected ? 1 : 0) + (statConnected ? 1 : 0);

  return (
    <div style={{ fontFamily: "'Sora', sans-serif" }}>

      {/* Focus banner / idle hint */}
      {focused ? (
        <div style={{ background: "#1f2937", borderRadius: "8px 8px 0 0", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace", marginBottom: 2 }}>SELECTED CONCEPT</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>Neurobiology</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{connCount}</div>
            <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace" }}>connections</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "#6b7280", padding: "6px 8px", background: "rgba(0,0,0,0.03)", borderRadius: 7, marginBottom: 7, border: "1px dashed #e5e7eb" }}>
          Click any concept to focus it
        </div>
      )}

      {/* Card grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: focused ? 7 : 0 }}>
        {/* Source card — shown only in idle mode */}
        {!focused && (
          <div style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #9ca3af", background: "#f9fafb", cursor: "pointer" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#1f2937" }}>Neurobiology</div>
          </div>
        )}

        {concepts.map(({ name, connected, expanded, color, strength, h }) => (
          <div key={name} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              padding: "7px 10px",
              borderRadius: expanded ? "7px 7px 0 0" : 7,
              border: connected ? `1.5px solid ${color}60` : `1.5px solid ${expanded ? "#1f2937" : "#e5e7eb"}`,
              borderLeft: connected ? `3px solid ${color}` : undefined,
              background: connected ? `${color}12` : "#fff",
              transition: "all 0.25s",
              position: "relative",
            }}>
              {connected && color && strength && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <div style={{ width: 14, height: h, background: color, borderRadius: 2, opacity: 0.85 }} />
                  <span style={{ fontSize: 8.5, fontWeight: 600, color, fontFamily: "'Sora', sans-serif" }}>{strength}</span>
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1f2937" }}>{name}</div>
              {focused && !connected && !expanded && (
                <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9ca3af" }}>+</span>
              )}
            </div>

            {expanded && (
              <div style={{ border: "1.5px solid #1f2937", borderTop: "none", borderRadius: "0 0 7px 7px", padding: "7px 6px", background: "#fff", display: "flex", gap: 4 }}>
                {[
                  { label: "Weak",     c: "#3b82f6", h: 2   },
                  { label: "Moderate", c: "#10b981", h: 3.5 },
                  { label: "Strong",   c: "#f59e0b", h: 5.5 },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "5px 3px", borderRadius: 5, border: "1px solid #e5e7eb" }}>
                    <div style={{ width: "50%", height: s.h, background: s.c, borderRadius: 2, opacity: 0.8 }} />
                    <span style={{ fontSize: 7.5, color: "#6b7280" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Caption */}
      <div style={{ marginTop: 8, fontSize: 9, color: "#9ca3af", fontFamily: "'Fira Code', monospace", textAlign: "center", minHeight: 12 }}>
        {frame === 0 && "click any concept to select it as the focus"}
        {frame === 1 && "Neurobiology selected — click others to connect"}
        {frame === 2 && "Cognition clicked — pick connection strength"}
        {frame === 3 && "Moderate saved — keep connecting"}
        {frame === 4 && "Statistics clicked — pick strength"}
        {frame === 5 && "2 connections drawn from Neurobiology"}
      </div>
    </div>
  );
}
