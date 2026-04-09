"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Edge, PLO, CLUSTER_COLORS } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";
import { TutorialOverlay, EdgeCreationDemo } from "./TutorialOverlay";

// ── Constants ─────────────────────────────────────────────────────────────────

const W_COLOR = ["", "#3b82f6", "#10b981", "#f59e0b"] as const;
const W_LABEL = ["", "Distant", "Nearby", "Adjacent"] as const;
const W_DESC  = ["", "far apart in your knowledge", "somewhat close", "immediately adjacent"] as const;
const W_STROKE = [0, 2, 3.5, 5.5] as const;

// Float amplitude per zone — closer connections float more actively
const ZONE_AMP = [3, 12, 9, 6] as const; // [unconnected, adjacent, nearby, distant]
const ZONE_PERIOD = [3.2, 2.2, 2.6, 3.0] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEdgeBetween(edges: Edge[], a: string, b: string) {
  return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
}

/** Use the original header from the file; fall back to the shortTitle. */
function getPloName(plo: PLO) {
  return plo.original?.trim() || plo.shortTitle;
}

// ── Float motion helper ───────────────────────────────────────────────────────

function FloatCard({
  children,
  amp,
  period,
  delay,
  style,
  onClick,
  whileHover,
}: {
  children: React.ReactNode;
  amp: number;
  period: number;
  delay: number;
  style?: React.CSSProperties;
  onClick?: () => void;
  whileHover?: Record<string, unknown>;
}) {
  return (
    <motion.div
      layout
      onClick={onClick}
      animate={{ y: [0, -amp, 0] }}
      transition={{ duration: period, ease: "easeInOut", repeat: Infinity, delay, repeatType: "loop" }}
      whileHover={whileHover as Parameters<typeof motion.div>[0]["whileHover"]}
      whileTap={{ scale: 0.97 }}
      style={{ cursor: onClick ? "pointer" : undefined, userSelect: "none", ...style }}
    >
      {children}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StepEdgeCreation() {
  const { session, setEdges, setRespondentStep, recordStepExit } = useAppStore();
  const plos       = session?.normalizedPLOs ?? [];
  const nodes      = session?.respondentData?.nodes ?? [];
  const savedEdges = session?.respondentData?.edges ?? [];

  const [showTutorial, setShowTutorial] = useState(true);
  const [focusId,      setFocusId]      = useState<string | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [edges,        setLocalEdges]   = useState<Edge[]>(savedEdges);

  const clusterMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.cluster) m.set(n.id, n.cluster);
    return m;
  }, [nodes]);

  const focusPlo     = plos.find((p) => p.id === focusId);
  const focusCluster = focusId ? clusterMap.get(focusId) : undefined;
  const focusColor   = focusCluster ? CLUSTER_COLORS[focusCluster - 1] : "#6366f1";
  const focusEdges   = focusId ? edges.filter((e) => e.source === focusId || e.target === focusId).length : 0;

  // Partition non-source PLOs into zones by connection weight
  const zones = useMemo<Record<0 | 1 | 2 | 3, PLO[]>>(() => {
    const z: Record<0 | 1 | 2 | 3, PLO[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const plo of plos) {
      if (plo.id === focusId) continue;
      const edge = focusId ? getEdgeBetween(edges, focusId, plo.id) : undefined;
      const w = (edge?.weight ?? 0) as 0 | 1 | 2 | 3;
      z[w].push(plo);
    }
    return z;
  }, [focusId, edges, plos]);

  // Cluster groups for unfocused view
  const clusteredGroups = useMemo(() => {
    const map = new Map<number, PLO[]>();
    const none: PLO[] = [];
    for (const p of plos) {
      const c = clusterMap.get(p.id);
      if (c) { if (!map.has(c)) map.set(c, []); map.get(c)!.push(p); }
      else none.push(p);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a - b);
    if (none.length) sorted.push([0, none]);
    return sorted;
  }, [plos, clusterMap]);

  function selectFocus(ploId: string) {
    setFocusId(ploId);
    setExpandedId(null);
  }

  function handleTargetClick(ploId: string) {
    // Toggle distance panel for this card
    setExpandedId((prev) => (prev === ploId ? null : ploId));
  }

  function handleSetStrength(targetId: string, w: Edge["weight"]) {
    if (!focusId) return;
    const existing = getEdgeBetween(edges, focusId, targetId);
    if (existing) {
      setLocalEdges((prev) => prev.map((e) => (e.id === existing.id ? { ...e, weight: w } : e)));
    } else {
      setLocalEdges((prev) => [...prev, { id: nanoid(), source: focusId, target: targetId, weight: w }]);
    }
    setExpandedId(null); // close panel — source card remains selected
  }

  function handleRemove(targetId: string) {
    if (!focusId) return;
    const ex = getEdgeBetween(edges, focusId, targetId);
    if (ex) setLocalEdges((prev) => prev.filter((e) => e.id !== ex.id));
    setExpandedId(null);
  }

  function proceed() {
    setEdges(edges);
    recordStepExit("edge_creation");
    setRespondentStep("metadata");
  }

  if (showTutorial) {
    return (
      <TutorialOverlay
        title="Connect related concepts"
        body="Click any concept to focus it, then click others to connect them. For each connection, say how close they are — Distant, Nearby, or Adjacent. No right or wrong answers."
        demo={<EdgeCreationDemo />}
        onDismiss={() => setShowTutorial(false)}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)", fontFamily: "'Sora', sans-serif" }}>

      {/* Top bar — minimal, just count + done */}
      <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid var(--line)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, fontSize: 12.5 }}>
          {focusId
            ? <span style={{ color: "var(--text-3)" }}>Click any concept below to draw a connection — or <button onClick={() => { setFocusId(null); setExpandedId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", fontWeight: 600, fontFamily: "'Sora', sans-serif", fontSize: 12.5, padding: 0, textDecoration: "underline" }}>deselect</button></span>
            : <span style={{ fontWeight: 600, color: "var(--ink)" }}>Click any concept to select it, then connect it to related ones</span>
          }
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {edges.length > 0 && (
            <span style={{ fontSize: 11, fontFamily: "'Fira Code', monospace", color: "var(--text-2)" }}>
              {edges.length} connection{edges.length !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={proceed} className="btn btn-primary" style={{ fontSize: 12, padding: "8px 20px" }}>
            {edges.length === 0 ? "Skip →" : "Done →"}
          </button>
        </div>
      </div>

      {/* Scrollable card area */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>

        {/* ── FOCUSED: source card + zones ──────────────────────────────── */}
        {focusId && focusPlo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Source card — large, glowing, clearly "chosen" */}
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: `linear-gradient(135deg, var(--ink) 0%, #1e3a5f 100%)`,
                border: `2px solid ${focusColor}`,
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: `0 0 0 4px ${focusColor}22, 0 12px 40px rgba(13,31,54,0.25)`,
                position: "relative",
              }}
            >
              {/* Animated ring */}
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.012, 1] }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
                style={{ position: "absolute", inset: -4, borderRadius: 20, border: `2px solid ${focusColor}55`, pointerEvents: "none" }}
              />
              <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                SELECTED CONCEPT — {focusEdges} connection{focusEdges !== 1 ? "s" : ""} made
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.35, marginBottom: 6 }}>
                {getPloName(focusPlo)}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 14 }}>
                {focusPlo.paraphrase}
              </div>
              <button
                onClick={() => { setFocusId(null); setExpandedId(null); }}
                style={{ fontSize: 11, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              >✕ Deselect</button>
            </motion.div>

            {/* Zones: Adjacent → Nearby → Distant → Unconnected */}
            {([3, 2, 1] as const).map((w) => {
              const group = zones[w];
              if (group.length === 0) return null;
              const color = W_COLOR[w];
              return (
                <ZoneSection key={w} label={W_LABEL[w]} desc={W_DESC[w]} color={color} count={group.length} strokeH={W_STROKE[w] * 2}>
                  {group.map((plo, idx) => {
                    const edge       = getEdgeBetween(edges, focusId, plo.id)!;
                    const isExpanded = expandedId === plo.id;
                    return (
                      <PloCard
                        key={plo.id}
                        plo={plo}
                        idx={idx}
                        amp={ZONE_AMP[w]}
                        period={ZONE_PERIOD[w]}
                        color={color}
                        weight={w}
                        isExpanded={isExpanded}
                        onCardClick={() => handleTargetClick(plo.id)}
                        panel={
                          <DistancePanel
                            currentWeight={edge.weight}
                            color={color}
                            onSelect={(ww) => handleSetStrength(plo.id, ww)}
                            onRemove={() => handleRemove(plo.id)}
                          />
                        }
                      />
                    );
                  })}
                </ZoneSection>
              );
            })}

            {/* Unconnected zone */}
            {zones[0].length > 0 && (
              <ZoneSection label="Not yet connected" desc="click to connect" color="var(--line-strong)" count={zones[0].length} strokeH={1.5} neutral>
                {zones[0].map((plo, idx) => {
                  const isExpanded = expandedId === plo.id;
                  return (
                    <PloCard
                      key={plo.id}
                      plo={plo}
                      idx={idx}
                      amp={ZONE_AMP[0]}
                      period={ZONE_PERIOD[0]}
                      color="var(--ink)"
                      weight={undefined}
                      isExpanded={isExpanded}
                      onCardClick={() => handleTargetClick(plo.id)}
                      panel={
                        <DistancePanel
                          currentWeight={undefined}
                          color="var(--ink)"
                          onSelect={(ww) => handleSetStrength(plo.id, ww)}
                          onRemove={undefined}
                        />
                      }
                    />
                  );
                })}
              </ZoneSection>
            )}
          </div>
        )}

        {/* ── UNFOCUSED: cluster groups ─────────────────────────────────── */}
        {!focusId && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {clusteredGroups.map(([clusterId, group]) => {
              const color = clusterId > 0 ? CLUSTER_COLORS[clusterId - 1] : "var(--text-3)";
              return (
                <div key={clusterId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>
                      {clusterId > 0 ? `GROUP ${clusterId}` : "UNASSIGNED"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
                    {group.map((plo, idx) => {
                      const connCount = edges.filter((e) => e.source === plo.id || e.target === plo.id).length;
                      const delay = (idx * 0.2) % 2.5;
                      return (
                        <FloatCard
                          key={plo.id}
                          amp={4}
                          period={3.0}
                          delay={delay}
                          onClick={() => selectFocus(plo.id)}
                          whileHover={{ scale: 1.03, boxShadow: `0 6px 20px ${color}28` }}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 10,
                            border: connCount > 0 ? `1.5px solid ${color}55` : "1.5px solid var(--line)",
                            borderLeft: connCount > 0 ? `4px solid ${color}` : undefined,
                            background: connCount > 0 ? `${color}08` : "#fff",
                            position: "relative",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4 }}>{getPloName(plo)}</div>
                          {connCount > 0 && (
                            <div style={{ position: "absolute", top: 7, right: 8, fontSize: 9, fontFamily: "'Fira Code', monospace", background: "var(--ink-pale)", color: "var(--text-2)", borderRadius: 10, padding: "1px 6px" }}>{connCount}</div>
                          )}
                        </FloatCard>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Zone section wrapper ──────────────────────────────────────────────────────

function ZoneSection({ label, desc, color, count, strokeH, neutral, children }: {
  label: string; desc: string; color: string; count: number; strokeH: number; neutral?: boolean; children: React.ReactNode;
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: strokeH, background: color, borderRadius: 2, opacity: neutral ? 0.4 : 0.85, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: neutral ? 500 : 700, color: neutral ? "var(--text-3)" : color, letterSpacing: "0.04em" }}>
          {label.toUpperCase()}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>— {desc}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "'Fira Code', monospace", color, background: neutral ? "var(--bg-subtle)" : `${color}18`, borderRadius: 8, padding: "1px 7px" }}>{count}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── Individual PLO card ───────────────────────────────────────────────────────

function PloCard({ plo, idx, amp, period, color, weight, isExpanded, onCardClick, panel }: {
  plo: PLO; idx: number; amp: number; period: number; color: string;
  weight: Edge["weight"] | undefined; isExpanded: boolean;
  onCardClick: () => void; panel: React.ReactNode;
}) {
  const delay = (idx * 0.21) % 2.5;
  const isConnected = weight !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <FloatCard
        amp={amp}
        period={period}
        delay={delay}
        onClick={onCardClick}
        whileHover={{ scale: 1.025, boxShadow: isConnected ? `0 6px 18px ${color}33` : "var(--sh-sm)" }}
        style={{
          padding: "12px 13px",
          borderRadius: isExpanded ? "10px 10px 0 0" : 10,
          border: isConnected ? `1.5px solid ${color}55` : `1.5px solid ${isExpanded ? "var(--ink)" : "var(--line)"}`,
          borderLeft: isConnected ? `4px solid ${color}` : undefined,
          background: isConnected ? `${color}0d` : "#fff",
          position: "relative",
        }}
      >
        {isConnected && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <div style={{ width: 14, height: W_STROKE[weight] * 1.5, background: color, borderRadius: 2, opacity: 0.8 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.05em" }}>{W_LABEL[weight]}</span>
          </div>
        )}
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4 }}>{getPloName(plo)}</div>
        {!isExpanded && (
          <div style={{ position: "absolute", bottom: 7, right: 9, fontSize: 9, color: isConnected ? color : "var(--text-3)", opacity: 0.6 }}>
            {isConnected ? "✎" : "+"}
          </div>
        )}
      </FloatCard>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Distance choice panel ─────────────────────────────────────────────────────

function DistancePanel({ currentWeight, color, onSelect, onRemove }: {
  currentWeight: Edge["weight"] | undefined; color: string;
  onSelect: (w: Edge["weight"]) => void; onRemove: (() => void) | undefined;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ border: "1.5px solid var(--ink)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px", background: "#fff", display: "flex", flexDirection: "column", gap: 9 }}
    >
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>
        HOW CLOSE ARE THESE CONCEPTS?
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        {([3, 2, 1] as const).map((w) => {
          const active = currentWeight === w;
          return (
            <motion.button
              key={w}
              onClick={() => onSelect(w)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                padding: "10px 4px", borderRadius: 9, outline: "none", cursor: "pointer",
                border: `2px solid ${active ? W_COLOR[w] : "var(--line)"}`,
                background: active ? `${W_COLOR[w]}14` : "#fff",
                transition: "border-color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = W_COLOR[w]; e.currentTarget.style.background = `${W_COLOR[w]}0d`; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "#fff"; } }}
            >
              <div style={{ width: "55%", height: W_STROKE[w] * 2.2, background: W_COLOR[w], borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? W_COLOR[w] : "var(--text-2)" }}>{W_LABEL[w]}</span>
              <span style={{ fontSize: 8, color: "var(--text-3)", textAlign: "center", lineHeight: 1.3 }}>{W_DESC[w]}</span>
            </motion.button>
          );
        })}
      </div>
      {onRemove && (
        <motion.button
          onClick={onRemove}
          whileHover={{ backgroundColor: "#fef2f2" }}
          style={{ padding: "5px", borderRadius: 6, border: "1px solid #fca5a5", background: "transparent", color: "#b91c1c", fontSize: 10, cursor: "pointer" }}
        >
          Remove connection
        </motion.button>
      )}
    </div>
  );
}
