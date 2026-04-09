"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Edge, PLO, CLUSTER_COLORS } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";
import { TutorialOverlay, EdgeCreationDemo } from "./TutorialOverlay";

const W_STROKE = [0, 2, 3.5, 5.5] as const;
const W_COLOR  = ["", "#3b82f6", "#10b981", "#f59e0b"] as const;
const W_LABEL  = ["", "Distant", "Nearby", "Adjacent"] as const;
const W_DESC   = ["", "far apart in your knowledge", "somewhat close", "immediately adjacent"] as const;

// Float amplitude per weight: closer → more energetic float
const FLOAT_Y = { connected: [-6, 0], subtle: [-3, 0] };

const WEIGHT_SECTIONS = [
  { weight: 3 as const, minWidth: 210, fontSize: 13,   padding: "14px 15px" },
  { weight: 2 as const, minWidth: 188, fontSize: 12.5, padding: "12px 13px" },
  { weight: 1 as const, minWidth: 172, fontSize: 12,   padding: "10px 12px" },
] as const;

function getEdgeBetween(edges: Edge[], a: string, b: string): Edge | undefined {
  return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
}

function getPloName(plo: PLO): string {
  return plo.original?.trim() || plo.shortTitle;
}

/** Framer Motion float animation — staggered by index */
function floatVariant(idx: number, amp: number) {
  const delay = (idx * 0.22) % 2.4;
  return {
    animate: {
      y: [0, -amp, 0],
      transition: {
        y: { duration: 2.6, ease: [0.45, 0, 0.55, 1] as [number,number,number,number], repeat: Infinity, delay },
      },
    },
  };
}

export function StepEdgeCreation() {
  const { session, setEdges, setRespondentStep, recordStepExit } = useAppStore();
  const plos       = session?.normalizedPLOs ?? [];
  const nodes      = session?.respondentData?.nodes ?? [];
  const savedEdges = session?.respondentData?.edges ?? [];

  const [showTutorial, setShowTutorial] = useState(true);
  const [focusId, setFocusId]           = useState<string | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [edges, setLocalEdges]          = useState<Edge[]>(savedEdges);

  const clusterMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.cluster) m.set(n.id, n.cluster);
    return m;
  }, [nodes]);

  const focusPlo     = plos.find((p) => p.id === focusId);
  const focusCluster = focusId ? clusterMap.get(focusId) : undefined;
  const focusColor   = focusCluster ? CLUSTER_COLORS[focusCluster - 1] : "var(--ink)";
  const focusEdgeCount = focusId
    ? edges.filter((e) => e.source === focusId || e.target === focusId).length
    : 0;

  const grouped = useMemo(() => {
    const byWeight = new Map<number, PLO[]>([[3, []], [2, []], [1, []], [0, []]]);
    for (const plo of plos) {
      if (plo.id === focusId) continue;
      const edge = focusId ? getEdgeBetween(edges, focusId, plo.id) : undefined;
      byWeight.get(edge?.weight ?? 0)!.push(plo);
    }
    return byWeight;
  }, [focusId, edges, plos]);

  const clusteredGroups = useMemo(() => {
    const map = new Map<number, PLO[]>();
    const unassigned: PLO[] = [];
    for (const p of plos) {
      const c = clusterMap.get(p.id);
      if (c) { if (!map.has(c)) map.set(c, []); map.get(c)!.push(p); }
      else unassigned.push(p);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a - b);
    if (unassigned.length) sorted.push([0, unassigned]);
    return sorted;
  }, [plos, clusterMap]);

  function handleCardClick(ploId: string) {
    if (!focusId) { setFocusId(ploId); setExpandedId(null); return; }
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
    setExpandedId(null);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid var(--line)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, fontSize: 12.5, fontFamily: "'Sora', sans-serif" }}>
          {focusId ? (
            <>
              <span style={{ fontWeight: 700, color: focusColor }}>{getPloName(focusPlo!)}</span>
              <span style={{ color: "var(--text-3)", marginLeft: 8 }}>— click another concept to connect</span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>Click any concept to focus it</span>
              <span style={{ color: "var(--text-3)", marginLeft: 8 }}>— then connect it to related concepts</span>
            </>
          )}
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

      {/* ── Focus banner ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {focusId && focusPlo && (
          <motion.div
            key="focus-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{ flexShrink: 0, background: "var(--ink)", padding: "14px 24px", display: "flex", alignItems: "flex-start", gap: 20, borderLeft: `4px solid ${focusColor}` }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>SELECTED CONCEPT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif", marginBottom: 4, lineHeight: 1.3 }}>{getPloName(focusPlo)}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Sora', sans-serif", lineHeight: 1.55 }}>{focusPlo.paraphrase}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => { setFocusId(null); setExpandedId(null); }}
                style={{ fontSize: 11, padding: "4px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.65)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.16)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              >✕ Deselect</button>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "'Sora', sans-serif" }}>{focusEdgeCount}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace" }}>connections</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Card area ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* FOCUSED MODE */}
        {focusId && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {WEIGHT_SECTIONS.map(({ weight, minWidth, fontSize, padding }) => {
              const group = grouped.get(weight)!;
              if (group.length === 0) return null;
              const color = W_COLOR[weight];
              return (
                <motion.div
                  key={weight}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: W_STROKE[weight] * 2, background: color, borderRadius: 2, opacity: 0.85, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Sora', sans-serif", letterSpacing: "0.04em" }}>{W_LABEL[weight].toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "'Sora', sans-serif" }}>— {W_DESC[weight]}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "'Fira Code', monospace", color, background: `${color}18`, borderRadius: 8, padding: "1px 7px" }}>{group.length}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 8 }}>
                    {group.map((plo, idx) => {
                      const edge       = getEdgeBetween(edges, focusId!, plo.id)!;
                      const isExpanded = expandedId === plo.id;
                      const cluster    = clusterMap.get(plo.id);
                      const dotColor   = cluster ? CLUSTER_COLORS[cluster - 1] : undefined;
                      const fv         = floatVariant(idx, 6);
                      return (
                        <div key={plo.id} style={{ display: "flex", flexDirection: "column" }}>
                          <motion.div
                            layout
                            onClick={() => handleCardClick(plo.id)}
                            animate={fv.animate}
                            whileHover={{ scale: 1.025, boxShadow: `0 6px 18px ${color}30` }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                              padding,
                              borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                              border: `1.5px solid ${color}55`,
                              borderLeft: `4px solid ${color}`,
                              background: `${color}0d`,
                              cursor: "pointer",
                              position: "relative",
                              userSelect: "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                              <div style={{ width: 16, height: W_STROKE[weight], background: color, borderRadius: 2, opacity: 0.8, flexShrink: 0 }} />
                              <span style={{ fontSize: 9.5, fontWeight: 700, color, fontFamily: "'Sora', sans-serif" }}>{W_LABEL[weight]}</span>
                            </div>
                            <div style={{ fontSize, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.35 }}>{getPloName(plo)}</div>
                            {dotColor && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: dotColor, opacity: 0.55 }} />}
                            {!isExpanded && <div style={{ position: "absolute", bottom: 7, right: 9, fontSize: 9, color, opacity: 0.6 }}>✎ edit</div>}
                          </motion.div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                key="panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                <DistancePanel
                                  currentWeight={edge.weight}
                                  color={color}
                                  onSelect={(w) => handleSetStrength(plo.id, w)}
                                  onRemove={() => handleRemove(plo.id)}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}

            {/* Not yet connected */}
            {(() => {
              const group = grouped.get(0)!;
              if (group.length === 0) return null;
              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 1.5, background: "var(--line-strong)", borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", fontFamily: "'Sora', sans-serif", letterSpacing: "0.04em" }}>NOT YET CONNECTED</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "'Fira Code', monospace", color: "var(--text-3)", background: "var(--bg-subtle)", borderRadius: 8, padding: "1px 7px" }}>{group.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))", gap: 8 }}>
                    {group.map((plo, idx) => {
                      const isExpanded = expandedId === plo.id;
                      const cluster    = clusterMap.get(plo.id);
                      const dotColor   = cluster ? CLUSTER_COLORS[cluster - 1] : undefined;
                      const fv         = floatVariant(idx, 3);
                      return (
                        <div key={plo.id} style={{ display: "flex", flexDirection: "column" }}>
                          <motion.div
                            layout
                            onClick={() => handleCardClick(plo.id)}
                            animate={fv.animate}
                            whileHover={{ scale: 1.02, boxShadow: "var(--sh-sm)" }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                              padding: "10px 12px",
                              borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                              border: `1.5px solid ${isExpanded ? "var(--ink)" : "var(--line)"}`,
                              background: "#fff",
                              cursor: "pointer",
                              position: "relative",
                              userSelect: "none",
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.35 }}>{getPloName(plo)}</div>
                            {dotColor && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: dotColor, opacity: 0.55 }} />}
                            {!isExpanded && <div style={{ position: "absolute", bottom: 7, right: 9, fontSize: 11, color: "var(--text-3)", opacity: 0.5 }}>+</div>}
                          </motion.div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                key="panel"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                <DistancePanel
                                  currentWeight={undefined}
                                  color="var(--ink)"
                                  onSelect={(w) => handleSetStrength(plo.id, w)}
                                  onRemove={undefined}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* UNFOCUSED MODE — grouped by cluster */}
        {!focusId && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {clusteredGroups.map(([clusterId, group]) => {
              const color = clusterId > 0 ? CLUSTER_COLORS[clusterId - 1] : "var(--text-3)";
              return (
                <div key={clusterId}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>
                      {clusterId > 0 ? `GROUP ${clusterId}` : "UNASSIGNED"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
                    {group.map((plo, idx) => {
                      const connCount = edges.filter((e) => e.source === plo.id || e.target === plo.id).length;
                      const fv        = floatVariant(idx, 3);
                      return (
                        <motion.div
                          key={plo.id}
                          layout
                          onClick={() => handleCardClick(plo.id)}
                          animate={fv.animate}
                          whileHover={{ scale: 1.02, boxShadow: `0 4px 14px ${color}28` }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            padding: "11px 12px",
                            borderRadius: 10,
                            border: connCount > 0 ? `1.5px solid ${color}50` : "1.5px solid var(--line)",
                            borderLeft: connCount > 0 ? `4px solid ${color}` : undefined,
                            background: connCount > 0 ? `${color}08` : "#fff",
                            cursor: "pointer",
                            position: "relative",
                            userSelect: "none",
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.35 }}>{getPloName(plo)}</div>
                          {connCount > 0 && (
                            <div style={{ position: "absolute", top: 7, right: 8, fontSize: 9, fontFamily: "'Fira Code', monospace", background: "var(--ink-pale)", color: "var(--text-2)", borderRadius: 10, padding: "1px 6px" }}>{connCount}</div>
                          )}
                        </motion.div>
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

// ── Distance panel ────────────────────────────────────────────────────────────
interface DistancePanelProps {
  currentWeight: Edge["weight"] | undefined;
  color: string;
  onSelect: (w: Edge["weight"]) => void;
  onRemove: (() => void) | undefined;
}

function DistancePanel({ currentWeight, color, onSelect, onRemove }: DistancePanelProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ border: "1.5px solid var(--ink)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "11px", background: "#fff", display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>HOW CLOSE ARE THESE CONCEPTS?</div>
      <div style={{ display: "flex", gap: 6 }}>
        {([3, 2, 1] as const).map((w) => {
          const active = currentWeight === w;
          return (
            <motion.button
              key={w}
              onClick={() => onSelect(w)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "9px 4px", borderRadius: 8, outline: "none", cursor: "pointer", border: `2px solid ${active ? W_COLOR[w] : "var(--line)"}`, background: active ? `${W_COLOR[w]}14` : "#fff", transition: "border-color 0.12s, background 0.12s" }}
            >
              <div style={{ width: "55%", height: W_STROKE[w] * 2, background: W_COLOR[w], borderRadius: 2, opacity: 0.85 }} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? W_COLOR[w] : "var(--text-2)", fontFamily: "'Sora', sans-serif" }}>{W_LABEL[w]}</span>
              <span style={{ fontSize: 8.5, color: "var(--text-3)", fontFamily: "'Sora', sans-serif", textAlign: "center" }}>{W_DESC[w]}</span>
            </motion.button>
          );
        })}
      </div>
      {onRemove && (
        <motion.button
          onClick={onRemove}
          whileHover={{ scale: 1.02, backgroundColor: "#fef2f2" }}
          style={{ padding: "5px", borderRadius: 6, border: "1px solid #fca5a5", background: "transparent", color: "#b91c1c", fontSize: 10, cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
        >Remove connection</motion.button>
      )}
    </div>
  );
}
