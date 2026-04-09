"use client";
import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Edge, PLO, CanvasNode, CLUSTER_COLORS } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";
import { TutorialOverlay, EdgeCreationDemo } from "./TutorialOverlay";

// ── Layout constants ──────────────────────────────────────────────────────────

const NODE_W   = 164;  // card width
const NODE_H   = 74;   // card height (fixed for edge calc)
const PAD      = 80;   // canvas padding around nodes
const FLOAT_AMP = 5;   // px of vertical float per node

// ── Edge visual config ────────────────────────────────────────────────────────

const W_COLOR  = { 1: "#3b82f6", 2: "#10b981", 3: "#f59e0b" } as const;
const W_LABEL  = { 1: "Distant",  2: "Nearby",   3: "Adjacent" } as const;
const W_DESC   = { 1: "far apart", 2: "somewhat close", 3: "immediately adjacent" } as const;
const W_WIDTH  = { 1: 2,          2: 3.5,        3: 5.5 } as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEdgeBetween(edges: Edge[], a: string, b: string) {
  return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
}

function getPloName(plo: PLO) {
  return plo.original?.trim() || plo.shortTitle;
}

/** Centre point of a node card */
function nodeCenter(pos: { x: number; y: number }) {
  return { cx: pos.x + NODE_W / 2, cy: pos.y + NODE_H / 2 };
}

/** If no clustering nodes are available, arrange PLOs in a grid */
function fallbackPositions(plos: PLO[]): CanvasNode[] {
  const cols = Math.ceil(Math.sqrt(plos.length));
  return plos.map((p, i) => ({
    id: p.id,
    x: PAD + (i % cols) * (NODE_W + 60),
    y: PAD + Math.floor(i / cols) * (NODE_H + 80),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StepEdgeCreation() {
  const { session, setEdges, setRespondentStep, recordStepExit } = useAppStore();
  const plos       = session?.normalizedPLOs ?? [];
  const storedNodes = session?.respondentData?.nodes ?? [];
  const savedEdges  = session?.respondentData?.edges ?? [];

  const [showTutorial, setShowTutorial] = useState(true);
  const [focusId,      setFocusId]      = useState<string | null>(null);
  const [pickerId,     setPickerId]     = useState<string | null>(null);
  const [hoverId,      setHoverId]      = useState<string | null>(null);
  const [edges,        setLocalEdges]   = useState<Edge[]>(savedEdges);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Node positions ─────────────────────────────────────────────────────────

  const nodes: CanvasNode[] = storedNodes.length > 0
    ? storedNodes
    : fallbackPositions(plos);

  const posMap = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const ploMap = useMemo(() => {
    const m = new Map<string, PLO>();
    for (const p of plos) m.set(p.id, p);
    return m;
  }, [plos]);

  const canvasW = useMemo(() => Math.max(...nodes.map(n => n.x + NODE_W + PAD), 600), [nodes]);
  const canvasH = useMemo(() => Math.max(...nodes.map(n => n.y + NODE_H + PAD), 400), [nodes]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const focusNode = focusId ? posMap.get(focusId) : null;
  const focusPlo  = focusId ? ploMap.get(focusId) : null;
  const focusCluster = focusNode?.cluster;
  const focusColor   = focusCluster ? CLUSTER_COLORS[focusCluster - 1] : "#818cf8";

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleNodeClick(ploId: string) {
    if (!focusId) {
      setFocusId(ploId);
      setPickerId(null);
      return;
    }
    if (ploId === focusId) {
      setFocusId(null);
      setPickerId(null);
      return;
    }
    // Open distance picker for this target
    setPickerId((prev) => (prev === ploId ? null : ploId));
  }

  function handleSetWeight(targetId: string, w: Edge["weight"]) {
    if (!focusId) return;
    const existing = getEdgeBetween(edges, focusId, targetId);
    if (existing) {
      setLocalEdges((prev) => prev.map((e) => e.id === existing.id ? { ...e, weight: w } : e));
    } else {
      setLocalEdges((prev) => [...prev, { id: nanoid(), source: focusId, target: targetId, weight: w }]);
    }
    setPickerId(null); // close picker — focus remains
  }

  function handleRemoveEdge(targetId: string) {
    if (!focusId) return;
    const ex = getEdgeBetween(edges, focusId, targetId);
    if (ex) setLocalEdges((prev) => prev.filter((e) => e.id !== ex.id));
    setPickerId(null);
  }

  function proceed() {
    setEdges(edges);
    recordStepExit("edge_creation");
    setRespondentStep("metadata");
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────

  if (showTutorial) {
    return (
      <TutorialOverlay
        title="Draw connections between concepts"
        body="Click a concept to select it, then click others to connect them. Choose how close each pair is: Adjacent, Nearby, or Distant."
        demo={<EdgeCreationDemo />}
        onDismiss={() => setShowTutorial(false)}
      />
    );
  }

  // ── Canvas render ──────────────────────────────────────────────────────────

  const pickerNode = pickerId ? posMap.get(pickerId) : null;
  const pickerEdge = (focusId && pickerId) ? getEdgeBetween(edges, focusId, pickerId) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--cv-bg)" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: "10px 20px",
        background: "rgba(10,22,36,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{ flex: 1, fontSize: 12.5, fontFamily: "'Sora', sans-serif" }}>
          {focusId && focusPlo ? (
            <>
              <span style={{ color: "rgba(255,255,255,0.35)", marginRight: 6 }}>Connecting from</span>
              <span style={{ color: focusColor, fontWeight: 700 }}>{getPloName(focusPlo)}</span>
              <button
                onClick={() => { setFocusId(null); setPickerId(null); }}
                style={{ marginLeft: 12, fontSize: 10.5, padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
              >✕ deselect</button>
            </>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Click any concept to start connecting</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {edges.length > 0 && (
            <span style={{ fontSize: 11, fontFamily: "'Fira Code', monospace", color: "rgba(255,255,255,0.3)" }}>
              {edges.length} edge{edges.length !== 1 ? "s" : ""}
            </span>
          )}
          {/* Legend */}
          <div style={{ display: "flex", gap: 8 }}>
            {([3, 2, 1] as const).map(w => (
              <div key={w} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 18, height: W_WIDTH[w], background: W_COLOR[w], borderRadius: 2, opacity: 0.7 }} />
                <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", fontFamily: "'Sora', sans-serif" }}>{W_LABEL[w]}</span>
              </div>
            ))}
          </div>
          <button onClick={proceed} className="btn btn-canvas-primary" style={{ fontSize: 12, padding: "8px 20px" }}>
            {edges.length === 0 ? "Skip →" : "Done →"}
          </button>
        </div>
      </div>

      {/* ── Graph canvas ────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div
          className="cv-grid"
          style={{ position: "relative", width: canvasW, height: canvasH, minWidth: "100%", minHeight: "100%" }}
          onClick={(e) => {
            // Click on canvas background → close picker
            if (e.target === e.currentTarget) setPickerId(null);
          }}
        >

          {/* ── SVG edge layer ─────────────────────────────────────────── */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
          >
            <defs>
              {/* Glow filter for selected edges */}
              <filter id="edge-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Existing edges */}
            {edges.map((edge) => {
              const aPos = posMap.get(edge.source);
              const bPos = posMap.get(edge.target);
              if (!aPos || !bPos) return null;
              const { cx: x1, cy: y1 } = nodeCenter(aPos);
              const { cx: x2, cy: y2 } = nodeCenter(bPos);
              const color = W_COLOR[edge.weight];
              const sw    = W_WIDTH[edge.weight];
              const isActive = edge.source === focusId || edge.target === focusId;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={edge.id}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    opacity={isActive ? 1 : 0.5}
                    filter={isActive ? "url(#edge-glow)" : undefined}
                  />
                  {/* Midpoint label */}
                  <rect x={mx - 22} y={my - 9} width={44} height={17} rx={4}
                    fill="rgba(10,22,36,0.85)" />
                  <text x={mx} y={my + 4} textAnchor="middle"
                    fontSize={8.5} fontFamily="'Sora', sans-serif"
                    fill={color} fontWeight={600}>
                    {W_LABEL[edge.weight]}
                  </text>
                </g>
              );
            })}

            {/* Dashed preview edge: source → hovered node */}
            {focusId && hoverId && hoverId !== focusId && hoverId !== pickerId && (() => {
              const aPos = focusNode;
              const bPos = posMap.get(hoverId);
              if (!aPos || !bPos) return null;
              const { cx: x1, cy: y1 } = nodeCenter(aPos);
              const { cx: x2, cy: y2 } = nodeCenter(bPos);
              return (
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>

          {/* ── Node cards ─────────────────────────────────────────────── */}
          {nodes.map((node, idx) => {
            const plo = ploMap.get(node.id);
            if (!plo) return null;
            const isFocus     = node.id === focusId;
            const isPicker    = node.id === pickerId;
            const edge        = focusId ? getEdgeBetween(edges, focusId, node.id) : undefined;
            const isConnected = !!edge && !isFocus;
            const clusterColor = node.cluster ? CLUSTER_COLORS[node.cluster - 1] : "rgba(255,255,255,0.2)";
            const edgeColor   = isConnected ? W_COLOR[edge!.weight] : null;
            const delay       = (idx * 0.19) % 2.5;

            return (
              <motion.div
                key={node.id}
                animate={{ y: [0, -FLOAT_AMP, 0] }}
                transition={{ duration: 2.6 + idx * 0.12, ease: "easeInOut", repeat: Infinity, delay }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  position: "absolute",
                  left: node.x,
                  top:  node.y,
                  width: NODE_W,
                  cursor: "pointer",
                  userSelect: "none",
                  zIndex: isFocus ? 20 : isPicker ? 15 : 10,
                }}
              >
                <div style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: isFocus
                    ? `linear-gradient(135deg, #1a3a5c 0%, #0f2440 100%)`
                    : "rgba(22,50,84,0.88)",
                  border: isFocus
                    ? `2px solid ${focusColor}`
                    : isConnected
                    ? `1.5px solid ${edgeColor}80`
                    : isPicker
                    ? "1.5px solid rgba(255,255,255,0.4)"
                    : "1px solid rgba(80,130,200,0.22)",
                  borderLeft: isConnected && !isFocus ? `4px solid ${edgeColor}` : undefined,
                  boxShadow: isFocus
                    ? `0 0 0 3px ${focusColor}30, 0 0 24px ${focusColor}40, 0 8px 32px rgba(0,0,0,0.4)`
                    : isConnected
                    ? `0 0 12px ${edgeColor}28, 0 4px 16px rgba(0,0,0,0.3)`
                    : "0 4px 16px rgba(0,0,0,0.3)",
                  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                  position: "relative",
                }}>
                  {/* Cluster dot */}
                  <div style={{
                    position: "absolute", top: 8, right: 9,
                    width: 6, height: 6, borderRadius: "50%",
                    background: clusterColor, opacity: isFocus ? 1 : 0.6,
                  }} />

                  {/* Pulsing ring on focus */}
                  {isFocus && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.03, 1] }}
                      transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                      style={{
                        position: "absolute", inset: -5, borderRadius: 16,
                        border: `2px solid ${focusColor}60`, pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Connection weight badge if connected */}
                  {isConnected && (
                    <div style={{
                      fontSize: 8.5, fontWeight: 700, color: edgeColor!,
                      fontFamily: "'Sora', sans-serif", marginBottom: 4,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <div style={{ width: 12, height: W_WIDTH[edge!.weight], background: edgeColor!, borderRadius: 2 }} />
                      {W_LABEL[edge!.weight]}
                    </div>
                  )}

                  {/* PLO name */}
                  <div style={{
                    fontSize: 11.5, fontWeight: 600, lineHeight: 1.35,
                    color: isFocus ? "#fff" : isConnected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
                    fontFamily: "'Sora', sans-serif",
                  }}>
                    {getPloName(plo)}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* ── Distance picker popover ─────────────────────────────────── */}
          <AnimatePresence>
            {pickerId && pickerNode && focusId && (
              <motion.div
                key="picker"
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ duration: 0.16 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: Math.min(pickerNode.x + NODE_W / 2 - 110, canvasW - 240),
                  top: pickerNode.y + NODE_H + 10,
                  width: 220,
                  background: "rgba(8,20,36,0.97)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: "14px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontFamily: "'Fira Code', monospace", marginBottom: 10 }}>
                  HOW CLOSE ARE THESE?
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {([3, 2, 1] as const).map((w) => {
                    const active = pickerEdge?.weight === w;
                    return (
                      <motion.button
                        key={w}
                        onClick={() => handleSetWeight(pickerId, w)}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer",
                          background: active ? `${W_COLOR[w]}22` : "rgba(255,255,255,0.05)",
                          outline: active ? `1.5px solid ${W_COLOR[w]}60` : "none",
                          transition: "background 0.12s",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ width: 22, height: W_WIDTH[w], background: W_COLOR[w], borderRadius: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: W_COLOR[w], fontFamily: "'Sora', sans-serif" }}>{W_LABEL[w]}</div>
                          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.3)", fontFamily: "'Sora', sans-serif" }}>{W_DESC[w]}</div>
                        </div>
                        {active && <div style={{ marginLeft: "auto", fontSize: 10, color: W_COLOR[w] }}>✓</div>}
                      </motion.button>
                    );
                  })}
                </div>
                {pickerEdge && (
                  <motion.button
                    onClick={() => handleRemoveEdge(pickerId)}
                    whileHover={{ backgroundColor: "rgba(239,68,68,0.12)" }}
                    style={{ marginTop: 8, width: "100%", padding: "6px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "rgba(239,68,68,0.7)", fontSize: 10, cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
                  >
                    Remove connection
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
