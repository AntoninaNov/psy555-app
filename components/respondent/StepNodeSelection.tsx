"use client";
import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { ProximityZone } from "@/lib/types";

// ── Zone config ───────────────────────────────────────────────────────────────

const ZONES: Array<{
  key: ProximityZone;
  label: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  key_hint: string;
}> = [
  {
    key:      "mine",
    label:    "Mine",
    sub:      "I own this concept",
    color:    "#15803d",
    bg:       "#f0fdf4",
    border:   "#86efac",
    dot:      "#22c55e",
    key_hint: "1",
  },
  {
    key:      "familiar",
    label:    "Familiar",
    sub:      "I know it, somewhat",
    color:    "#b45309",
    bg:       "#fffbeb",
    border:   "#fcd34d",
    dot:      "#f59e0b",
    key_hint: "2",
  },
  {
    key:      "distant",
    label:    "Distant",
    sub:      "Feels foreign to me",
    color:    "#b91c1c",
    bg:       "#fef2f2",
    border:   "#fca5a5",
    dot:      "#ef4444",
    key_hint: "3",
  },
];

// ── Grid layout for edge creation ─────────────────────────────────────────────

function assignGridPositions(
  ids: string[],
): Array<{ id: string; x: number; y: number }> {
  const COLS      = 5;
  const SPACING_X = 300;
  const SPACING_Y = 180;
  const OFFSET_X  = 180;
  const OFFSET_Y  = 120;
  return ids.map((id, i) => ({
    id,
    x: OFFSET_X + (i % COLS) * SPACING_X + (Math.random() - 0.5) * 40,
    y: OFFSET_Y + Math.floor(i / COLS) * SPACING_Y + (Math.random() - 0.5) * 20,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function StepNodeSelection() {
  const { session, setNodes, setRespondentStep, recordStepExit } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];

  const [ratings,  setRatings]  = useState<Array<{ id: string; zone: ProximityZone }>>([]);
  const [animKey,  setAnimKey]  = useState(0);

  const currentIndex = ratings.length;
  const currentPlo   = plos[currentIndex];
  const isComplete   = plos.length > 0 && currentIndex >= plos.length;

  // ── Rating action ──────────────────────────────────────────────────────────

  const rate = useCallback((zone: ProximityZone) => {
    setRatings(prev => [...prev, { id: plos[prev.length].id, zone }]);
    setAnimKey(k => k + 1);
  }, [plos]);

  const undo = useCallback(() => {
    if (ratings.length === 0) return;
    setRatings(prev => prev.slice(0, -1));
    setAnimKey(k => k + 1);
  }, [ratings.length]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isComplete) return;
      if (e.key === "1") rate("mine");
      else if (e.key === "2") rate("familiar");
      else if (e.key === "3") rate("distant");
      else if (e.key === "Backspace" || e.key === "ArrowLeft") undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isComplete, rate, undo]);

  // ── Proceed to edge creation ───────────────────────────────────────────────

  function proceed() {
    const positions = assignGridPositions(plos.map(p => p.id));
    const nodes = positions.map(pos => ({
      ...pos,
      proximity: ratings.find(r => r.id === pos.id)?.zone ?? ("distant" as ProximityZone),
    }));
    setNodes(nodes);
    recordStepExit("node_selection");
    setRespondentStep("edge_creation");
  }

  // ── Derived counts ─────────────────────────────────────────────────────────

  const counts = {
    mine:     ratings.filter(r => r.zone === "mine").length,
    familiar: ratings.filter(r => r.zone === "familiar").length,
    distant:  ratings.filter(r => r.zone === "distant").length,
  };
  const progress = plos.length > 0 ? (currentIndex / plos.length) * 100 : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // Complete state
  // ══════════════════════════════════════════════════════════════════════════

  if (isComplete) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)", padding: "32px 24px",
      }}>
        <div className="anim-up" style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>

          {/* Check icon */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#f0fdf4", border: "1.5px solid #86efac",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4.5 11l4.5 4.5 8.5-9" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 30, fontWeight: 700, color: "var(--ink)", marginBottom: 8,
          }}>
            All {plos.length} concepts rated
          </div>
          <div style={{
            fontSize: 13, color: "var(--text-2)",
            fontFamily: "'Sora', sans-serif", lineHeight: 1.6, marginBottom: 32,
          }}>
            Your proximity profile is recorded. Next you'll draw connections between concepts.
          </div>

          {/* Zone summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
            {ZONES.map(z => (
              <div key={z.key} style={{
                flex: 1,
                background: z.bg,
                border: `1.5px solid ${z.border}`,
                borderRadius: 12, padding: "16px 10px", textAlign: "center",
              }}>
                <div style={{
                  fontSize: 34, fontWeight: 700, color: z.color,
                  fontFamily: "'Cormorant Garamond', serif", lineHeight: 1,
                }}>
                  {counts[z.key]}
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: z.dot, margin: "6px auto 4px",
                }} />
                <div style={{
                  fontSize: 12, fontWeight: 600, color: z.color,
                  fontFamily: "'Sora', sans-serif",
                }}>
                  {z.label}
                </div>
              </div>
            ))}
          </div>

          <button onClick={proceed} className="btn btn-primary" style={{ width: "100%", padding: "13px 24px", fontSize: 14 }}>
            Next: draw connections →
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Card swipe state
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", background: "var(--bg)",
    }}>

      {/* ── Progress ── */}
      <div style={{ width: "100%", maxWidth: 520, padding: "24px 24px 0" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 8,
        }}>
          <span style={{
            fontSize: 11, fontFamily: "'Fira Code', monospace",
            color: "var(--text-3)", letterSpacing: "0.04em",
          }}>
            {currentIndex} / {plos.length} rated
          </span>
          {ratings.length > 0 && (
            <button
              onClick={undo}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "var(--text-3)",
                fontFamily: "'Sora', sans-serif",
                padding: "2px 6px", borderRadius: 4,
                transition: "color 0.12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)")}
            >
              ← undo
            </button>
          )}
        </div>
        <div style={{ height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, var(--ink) 0%, var(--rust) 100%)",
            width: `${progress}%`, transition: "width 0.25s ease",
          }} />
        </div>
      </div>

      {/* ── Concept card ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "28px 24px 20px", width: "100%", maxWidth: 520,
      }}>
        {currentPlo && (
          <div
            key={animKey}
            style={{
              width: "100%",
              background: "#fff",
              border: "1.5px solid var(--line)",
              borderRadius: 18,
              padding: "36px 36px 32px",
              boxShadow: "var(--sh-md)",
              animation: "card-enter 0.22s ease both",
            }}
          >
            <div style={{
              fontSize: 10, fontFamily: "'Fira Code', monospace",
              color: "var(--text-3)", marginBottom: 16, letterSpacing: "0.06em",
            }}>
              #{currentIndex + 1} of {plos.length}
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 32, fontWeight: 700,
              color: "var(--ink)", lineHeight: 1.15, marginBottom: 14,
            }}>
              {currentPlo.shortTitle}
            </div>
            {currentPlo.paraphrase && (
              <div style={{
                fontSize: 13.5, color: "var(--text-2)",
                fontFamily: "'Sora', sans-serif", lineHeight: 1.65,
              }}>
                {currentPlo.paraphrase}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Zone buttons ── */}
      <div style={{
        width: "100%", maxWidth: 520,
        padding: "0 24px 32px",
        display: "flex", gap: 10,
      }}>
        {ZONES.map(z => (
          <button
            key={z.key}
            onClick={() => rate(z.key)}
            style={{
              flex: 1, padding: "14px 8px",
              background: z.bg,
              border: `1.5px solid ${z.border}`,
              borderRadius: 14, cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 5,
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "var(--sh-sm)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.transform = "";
              el.style.boxShadow = "";
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: z.dot }} />
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: z.color, fontFamily: "'Sora', sans-serif",
            }}>
              {z.label}
            </span>
            <span style={{
              fontSize: 10.5, color: z.color, opacity: 0.75,
              fontFamily: "'Sora', sans-serif", textAlign: "center",
            }}>
              {z.sub}
            </span>
            <span style={{
              fontSize: 9, fontFamily: "'Fira Code', monospace",
              color: z.color, opacity: 0.45, marginTop: 1,
            }}>
              press {z.key_hint}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}
