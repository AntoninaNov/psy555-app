"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { CLUSTER_COLORS, PLO, Edge, CanvasNode } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

const NW = 196;
const MIN_NH = 52;
const MAX_G = 5;
const CARD_FONT = "'Sora', sans-serif";
const EC = { 1: "#64748b", 2: "#60a5fa", 3: "#fbbf24" } as const;
const EW = { 1: 1.5, 2: 2.5, 3: 4.0 } as const;
const EL = { 1: "Distant", 2: "Nearby", 3: "Adjacent" } as const;

function getNodeLabel(plo: PLO) {
  return plo.shortTitle.trim();
}

function estimateNodeHeight(label: string) {
  const maxCharsPerLine = 22;
  const words = label.split(/\s+/).filter(Boolean);
  let lines = 1;
  let current = 0;

  for (const word of words) {
    const next = word.length + (current > 0 ? 1 : 0);
    if (current > 0 && current + next > maxCharsPerLine) {
      lines += 1;
      current = word.length;
    } else {
      current += next;
    }
  }

  return Math.max(MIN_NH, 20 + lines * 16);
}

function initGroups(plos: PLO[], n: number): Record<string, number> {
  const g: Record<string, number> = {};
  plos.forEach((p, i) => {
    g[p.id] = (i % n) + 1;
  });
  return g;
}

function getGroupBases(
  plos: PLO[],
  groups: Record<string, number>,
  gc: number,
  width: number,
  height: number,
  heights: Record<string, number>,
) {
  const pad = 95;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  const centers: { x: number; y: number }[] = {
    1: [{ x: width / 2, y: height / 2 }],
    2: [{ x: pad + iw * 0.22, y: height / 2 }, { x: pad + iw * 0.78, y: height / 2 }],
    3: [
      { x: pad + iw * 0.2, y: pad + ih * 0.28 },
      { x: pad + iw * 0.8, y: pad + ih * 0.28 },
      { x: pad + iw * 0.5, y: pad + ih * 0.78 },
    ],
    4: [
      { x: pad + iw * 0.23, y: pad + ih * 0.26 },
      { x: pad + iw * 0.77, y: pad + ih * 0.26 },
      { x: pad + iw * 0.23, y: pad + ih * 0.77 },
      { x: pad + iw * 0.77, y: pad + ih * 0.77 },
    ],
    5: [
      { x: pad + iw * 0.14, y: pad + ih * 0.22 },
      { x: pad + iw * 0.5, y: pad + ih * 0.12 },
      { x: pad + iw * 0.86, y: pad + ih * 0.22 },
      { x: pad + iw * 0.3, y: pad + ih * 0.78 },
      { x: pad + iw * 0.7, y: pad + ih * 0.78 },
    ],
  }[gc] ?? [];

  const byGroup = new Map<number, PLO[]>();
  for (let g = 1; g <= gc; g += 1) byGroup.set(g, []);
  plos.forEach((plo) => {
    const groupId = groups[plo.id] ?? 1;
    if (!byGroup.has(groupId)) byGroup.set(groupId, []);
    byGroup.get(groupId)!.push(plo);
  });

  const base: Record<string, { x: number; y: number }> = {};
  byGroup.forEach((members, groupId) => {
    const center = centers[(groupId - 1) % centers.length] ?? { x: width / 2, y: height / 2 };
    const cols = Math.min(2, members.length);
    const avgHeight = members.reduce((sum, member) => sum + (heights[member.id] ?? MIN_NH), 0) / Math.max(members.length, 1);
    const sx = NW + 28;
    const sy = avgHeight + 26;
    const totalRows = Math.ceil(members.length / cols);

    members.forEach((member, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const nodeHeight = heights[member.id] ?? MIN_NH;
      base[member.id] = {
        x: Math.max(4, Math.min(width - NW - 4, center.x - NW / 2 + (col - (cols - 1) / 2) * sx)),
        y: Math.max(4, Math.min(height - nodeHeight - 4, center.y - nodeHeight / 2 + (row - (totalRows - 1) / 2) * sy)),
      };
    });
  });

  return base;
}

function computeLayout(
  plos: PLO[],
  groups: Record<string, number>,
  gc: number,
  width: number,
  height: number,
  heights: Record<string, number>,
  edges: Edge[],
  seed?: Record<string, { x: number; y: number }>,
) {
  const base = getGroupBases(plos, groups, gc, width, height, heights);
  const pos = Object.fromEntries(
    plos.map((plo) => {
      const fallback = base[plo.id] ?? { x: width / 2 - NW / 2, y: height / 2 - (heights[plo.id] ?? MIN_NH) / 2 };
      const seeded = seed?.[plo.id];
      return [plo.id, seeded ? { x: (seeded.x + fallback.x) / 2, y: (seeded.y + fallback.y) / 2 } : fallback];
    }),
  ) as Record<string, { x: number; y: number }>;

  const desiredDistance: Record<Edge["weight"], number> = { 1: 248, 2: 178, 3: 118 };

  for (let i = 0; i < 80; i += 1) {
    const delta: Record<string, { x: number; y: number }> = {};
    plos.forEach((plo) => {
      delta[plo.id] = { x: 0, y: 0 };
    });

    for (let a = 0; a < plos.length; a += 1) {
      for (let b = a + 1; b < plos.length; b += 1) {
        const pa = plos[a];
        const pb = plos[b];
        const aPos = pos[pa.id];
        const bPos = pos[pb.id];
        const aH = heights[pa.id] ?? MIN_NH;
        const bH = heights[pb.id] ?? MIN_NH;
        const ax = aPos.x + NW / 2;
        const ay = aPos.y + aH / 2;
        const bx = bPos.x + NW / 2;
        const by = bPos.y + bH / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const minDist = 124 + (aH + bH) / 4;

        if (dist < minDist) {
          const push = (minDist - dist) * 0.07;
          const ux = dx / dist;
          const uy = dy / dist;
          delta[pa.id].x -= ux * push;
          delta[pa.id].y -= uy * push;
          delta[pb.id].x += ux * push;
          delta[pb.id].y += uy * push;
        }
      }
    }

    edges.forEach((edge) => {
      const aPos = pos[edge.source];
      const bPos = pos[edge.target];
      if (!aPos || !bPos) return;

      const aH = heights[edge.source] ?? MIN_NH;
      const bH = heights[edge.target] ?? MIN_NH;
      const ax = aPos.x + NW / 2;
      const ay = aPos.y + aH / 2;
      const bx = bPos.x + NW / 2;
      const by = bPos.y + bH / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const goal = desiredDistance[edge.weight];
      const pull = (dist - goal) * 0.04;
      const ux = dx / dist;
      const uy = dy / dist;

      delta[edge.source].x += ux * pull;
      delta[edge.source].y += uy * pull;
      delta[edge.target].x -= ux * pull;
      delta[edge.target].y -= uy * pull;
    });

    plos.forEach((plo) => {
      const anchor = base[plo.id] ?? pos[plo.id];
      delta[plo.id].x += (anchor.x - pos[plo.id].x) * 0.08;
      delta[plo.id].y += (anchor.y - pos[plo.id].y) * 0.08;
    });

    plos.forEach((plo) => {
      const h = heights[plo.id] ?? MIN_NH;
      pos[plo.id] = {
        x: Math.max(4, Math.min(width - NW - 4, pos[plo.id].x + delta[plo.id].x)),
        y: Math.max(4, Math.min(height - h - 4, pos[plo.id].y + delta[plo.id].y)),
      };
    });
  }

  return pos;
}

function getEdge(edges: Edge[], a: string, b: string) {
  return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
}

export function StepConceptMap() {
  const { session, setNodes, setEdges: saveEdges, setRespondentStep, recordStepExit } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];
  const heights = Object.fromEntries(plos.map((plo) => [plo.id, estimateNodeHeight(getNodeLabel(plo))])) as Record<string, number>;

  const cvRef = useRef<HTMLDivElement>(null);
  const [cs, setCs] = useState({ w: 900, h: 480 });
  useEffect(() => {
    const el = cvRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setCs({ w: rect.width, h: rect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const storedNodes = session?.respondentData?.nodes ?? [];
  const storedEdges = session?.respondentData?.edges ?? [];
  const hasStored = storedNodes.length > 0;

  const [gc, setGc] = useState(() => {
    if (hasStored) {
      const clusters = new Set(storedNodes.map((node) => node.cluster ?? 1));
      return Math.max(clusters.size, 2);
    }
    return 3;
  });

  const [groups, setGroups] = useState<Record<string, number>>(() => {
    if (hasStored) {
      const next: Record<string, number> = {};
      storedNodes.forEach((node) => {
        next[node.id] = node.cluster ?? 1;
      });
      return next;
    }
    return initGroups(plos, 3);
  });

  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() => {
    if (hasStored) {
      const next: Record<string, { x: number; y: number }> = {};
      storedNodes.forEach((node) => {
        next[node.id] = { x: node.x, y: node.y };
      });
      return next;
    }
    return {};
  });

  const [edges, setEdges] = useState<Edge[]>(hasStored ? storedEdges : []);
  const [selId, setSelId] = useState<string | null>(null);
  const [paintG, setPaintG] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ id: string; x: number; y: number; sourceId?: string } | null>(null);

  const inited = useRef(hasStored);
  useEffect(() => {
    if (cs.w < 100 || inited.current) return;
    inited.current = true;
    const frame = requestAnimationFrame(() => {
      setPos(computeLayout(plos, groups, gc, cs.w, cs.h, heights, edges));
    });
    return () => cancelAnimationFrame(frame);
  }, [cs.w]); // eslint-disable-line react-hooks/exhaustive-deps

  function relayout(newGc?: number, newGroups?: Record<string, number>) {
    const nextGc = newGc ?? gc;
    const nextGroups = newGroups ?? groups;
    setPos((prev) => computeLayout(plos, nextGroups, nextGc, cs.w, cs.h, heights, edges, prev));
  }

  useEffect(() => {
    if (cs.w < 100 || Object.keys(pos).length === 0) return;
    const frame = requestAnimationFrame(() => {
      setPos((prev) => computeLayout(plos, groups, gc, cs.w, cs.h, heights, edges, prev));
    });
    return () => cancelAnimationFrame(frame);
  }, [edges, groups, gc, cs.w, cs.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const dragged = useRef(false);
  const SR = useRef({ selId, groups, edges, paintG, pos, cs, heights });
  useEffect(() => {
    SR.current = { selId, groups, edges, paintG, pos, cs, heights };
  }, [selId, groups, edges, paintG, pos, cs, heights]);


  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      const { id, sx, sy, ox, oy } = drag.current;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
      if (!dragged.current) return;

      const { cs: size, heights: cardHeights } = SR.current;
      const nodeHeight = cardHeights[id] ?? MIN_NH;
      setPos((prev) => ({
        ...prev,
        [id]: {
          x: Math.max(0, Math.min(size.w - NW, ox + dx)),
          y: Math.max(0, Math.min(size.h - nodeHeight, oy + dy)),
        },
      }));
    }

    function handleSelectOrConnect(id: string) {
      const { selId: currentSel, paintG: currentPaint, edges: currentEdges, pos: currentPos, heights: cardHeights } = SR.current;
      setPicker(null);

      if (currentPaint !== null) {
        setGroups((prev) => ({ ...prev, [id]: currentPaint }));
        return;
      }

      if (!currentSel) {
        setSelId(id);
        return;
      }

      if (currentSel === id) return;

      const existing = getEdge(currentEdges, currentSel, id);
      const a = currentPos[currentSel];
      const b = currentPos[id];
      const midX = a && b ? (a.x + NW / 2 + b.x + NW / 2) / 2 : 0;
      const midY = a && b ? (a.y + (cardHeights[currentSel] ?? MIN_NH) / 2 + b.y + (cardHeights[id] ?? MIN_NH) / 2) / 2 : 0;

      if (existing) {
        if (a && b) setPicker({ id: existing.id, x: midX, y: midY, sourceId: currentSel });
        return;
      }

      const edgeId = nanoid();
      setEdges((prev) => [...prev, { id: edgeId, source: currentSel, target: id, weight: 1 }]);
      if (a && b) setPicker({ id: edgeId, x: midX, y: midY, sourceId: currentSel });
    }

    function onUp() {
      if (!drag.current) return;
      const { id } = drag.current;
      drag.current = null;
      if (!dragged.current) handleSelectOrConnect(id);
      dragged.current = false;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function finish() {
    const conn: Record<string, number> = {};
    edges.forEach((edge) => {
      conn[edge.source] = (conn[edge.source] ?? 0) + 1;
      conn[edge.target] = (conn[edge.target] ?? 0) + 1;
    });

    const anchor: Record<number, string> = {};
    for (let g = 1; g <= gc; g += 1) {
      const members = plos.filter((plo) => (groups[plo.id] ?? 1) === g);
      if (members.length) anchor[g] = members.sort((a, b) => (conn[b.id] ?? 0) - (conn[a.id] ?? 0))[0].id;
    }

    const nodes: CanvasNode[] = plos.map((plo) => ({
      id: plo.id,
      x: pos[plo.id]?.x ?? 0,
      y: pos[plo.id]?.y ?? 0,
      cluster: groups[plo.id] ?? 1,
      isCentral: anchor[groups[plo.id] ?? 1] === plo.id,
    }));

    setNodes(nodes);
    saveEdges(edges);
    recordStepExit("clustering");
    setRespondentStep("metadata");
  }

  const selectedPlo = selId ? plos.find((plo) => plo.id === selId) ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0b1a27", color: "#fff", fontFamily: CARD_FONT }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "rgba(11,26,39,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
        <div style={{ flex: 1, fontSize: 11.5, minWidth: 0 }}>
          {selId ? (
            <>
              <span style={{ color: "#fff", fontWeight: 700 }}>Selected: {selectedPlo ? getNodeLabel(selectedPlo) : selId}</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}> РїС—Р… click other cards to keep connecting РїС—Р… choose distance after each link РїС—Р… click the map to cancel</span>
            </>
          ) : paintG !== null ? (
            <>
              <span style={{ color: CLUSTER_COLORS[paintG - 1], fontWeight: 700 }}>Paint mode on</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}> РїС—Р… click concepts to move them to this group РїС—Р… click the colour again to stop</span>
            </>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.35)" }}>Select a concept to connect РїС—Р… drag to move РїС—Р… click a connection dot to change distance</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {Array.from({ length: gc }, (_, i) => i + 1).map((g) => {
            const color = CLUSTER_COLORS[g - 1];
            const count = plos.filter((plo) => (groups[plo.id] ?? 1) === g).length;
            const active = paintG === g;
            return (
              <button
                key={g}
                onClick={() => {
                  setPaintG((prev) => (prev === g ? null : g));
                  setSelId(null);
                  setPicker(null);
                }}
                title={`Group ${g} - click to paint concepts into this group`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${active ? color : "rgba(255,255,255,0.08)"}`, background: active ? `${color}20` : `${color}10`, cursor: "pointer", transition: "all 0.15s" }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: active ? `0 0 0 2px ${color}40` : "none" }} />
                <span style={{ fontSize: 10, color: active ? color : "rgba(255,255,255,0.6)", fontFamily: CARD_FONT, fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}

          {gc < MAX_G && (
            <button
              onClick={() => {
                const nextGc = gc + 1;
                const nextGroups = initGroups(plos, nextGc);
                setGc(nextGc);
                setGroups(nextGroups);
                relayout(nextGc, nextGroups);
              }}
              title="Add a group"
              style={{ padding: "5px 9px", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11 }}
            >
              +
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, opacity: 0.6 }}>
          {([1, 2, 3] as const).map((w) => (
            <div key={w} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 14, height: EW[w] * 2, background: EC[w], borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", fontFamily: CARD_FONT }}>{EL[w]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => relayout()}
          title="Re-arrange nodes by group and connection strength"
          style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 10.5, flexShrink: 0 }}
        >
          Tidy
        </button>

        {edges.length > 0 && (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: CARD_FONT, fontWeight: 700, flexShrink: 0 }}>
            {edges.length} link{edges.length !== 1 ? "s" : ""}
          </span>
        )}

        <button
          onClick={finish}
          style={{ padding: "7px 18px", borderRadius: 9, background: "#C84B1C", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}
        >
          Done {"->"}
        </button>
      </div>

      <div
        ref={cvRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onClick={(e) => {
          const target = e.target as Element;
          if (!target.closest("[data-node]") && !target.closest("[data-picker]")) {
            setSelId(null);
            setPaintG(null);
            setPicker(null);
          }
        }}
      >
        <GroupHalos plos={plos} groups={groups} gc={gc} pos={pos} heights={heights} />

        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} onClick={(e) => e.stopPropagation()}>
          {edges.map((edge) => {
            const a = pos[edge.source];
            const b = pos[edge.target];
            if (!a || !b) return null;

            const ax = a.x + NW / 2;
            const ay = a.y + (heights[edge.source] ?? MIN_NH) / 2;
            const bx = b.x + NW / 2;
            const by = b.y + (heights[edge.target] ?? MIN_NH) / 2;
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2;
            const color = EC[edge.weight];
            const stroke = EW[edge.weight];
            const open = picker?.id === edge.id;

            return (
              <g key={edge.id}>
                <line
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  stroke="transparent"
                  strokeWidth={22}
                  style={{ cursor: "pointer", pointerEvents: "stroke" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setPicker((prev) => (prev?.id === edge.id ? null : { id: edge.id, x: mx, y: my, sourceId: selId ?? edge.source }));
                  }}
                />
                <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={stroke} strokeOpacity={open ? 0.9 : 0.45} strokeLinecap="round" />
                <circle
                  cx={mx}
                  cy={my}
                  r={open ? 7 : 4.5}
                  fill={open ? color : "#0b1a27"}
                  stroke={color}
                  strokeWidth={1.5}
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setPicker((prev) => (prev?.id === edge.id ? null : { id: edge.id, x: mx, y: my, sourceId: selId ?? edge.source }));
                  }}
                />
              </g>
            );
          })}
        </svg>

        {plos.map((plo) => {
          const point = pos[plo.id];
          if (!point) return null;
          const groupId = groups[plo.id] ?? 1;
          const color = CLUSTER_COLORS[groupId - 1];
          const selected = selId === plo.id;
          const isPaintTarget = paintG !== null && paintG !== groupId;
          const connections = edges.filter((edge) => edge.source === plo.id || edge.target === plo.id).length;
          const nodeHeight = heights[plo.id] ?? MIN_NH;

          return (
            <div
              key={plo.id}
              data-node="true"
              onPointerDown={(e) => {
                e.stopPropagation();
                dragged.current = false;
                drag.current = { id: plo.id, sx: e.clientX, sy: e.clientY, ox: point.x, oy: point.y };
              }}
              style={{
                position: "absolute",
                left: point.x,
                top: point.y,
                width: NW,
                minHeight: nodeHeight,
                background: selected ? `${color}2e` : "rgba(255,255,255,0.055)",
                border: `1.5px solid ${selected ? "#ffffff" : `${color}55`}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 10,
                cursor: "grab",
                display: "flex",
                alignItems: "flex-start",
                padding: "9px 9px 9px 11px",
                gap: 7,
                boxShadow: selected ? `0 0 0 3px ${color}40, 0 0 0 5px rgba(255,255,255,0.12), 0 8px 26px rgba(0,0,0,0.55)` : "0 2px 8px rgba(0,0,0,0.4)",
                transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s, opacity 0.15s",
                zIndex: selected ? 10 : 2,
                opacity: isPaintTarget ? 0.4 : 1,
                touchAction: "none",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: selected ? "#fff" : "rgba(255,255,255,0.86)",
                  lineHeight: 1.28,
                  flex: 1,
                  whiteSpace: "normal",
                  pointerEvents: "none",
                  fontFamily: CARD_FONT,
                }}
              >
                {getNodeLabel(plo)}
              </span>
              {connections > 0 && (
                <span style={{ fontSize: 10, color: selected ? "#fff" : `${color}cc`, fontFamily: CARD_FONT, fontWeight: 700, flexShrink: 0, pointerEvents: "none", paddingTop: 1 }}>
                  {connections}
                </span>
              )}
            </div>
          );
        })}

        {picker && (() => {
          const edge = edges.find((candidate) => candidate.id === picker.id);
          if (!edge) return null;

          const px = Math.max(8, Math.min(cs.w - 192, picker.x - 82));
          const py = Math.max(8, Math.min(cs.h - 158, picker.y - 108));

          return (
            <div
              data-picker="true"
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", left: px, top: py, zIndex: 30, background: "#162539", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.65)", width: 172 }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.28)", fontFamily: CARD_FONT, marginBottom: 8 }}>HOW CLOSE ARE THESE CONCEPTS?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {([1, 2, 3] as const).map((w) => {
                  const active = edge.weight === w;
                  const color = EC[w];
                  return (
                    <button
                      key={w}
                      onClick={() => {
                        setEdges((prev) => prev.map((candidate) => (candidate.id === edge.id ? { ...candidate, weight: w } : candidate)));
                        setSelId(picker.sourceId ?? edge.source);
                        setPicker(null);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${active ? color : "transparent"}`, background: active ? `${color}18` : "transparent", cursor: "pointer" }}
                    >
                      <div style={{ width: 20, height: EW[w] * 2, background: color, borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: active ? color : "rgba(255,255,255,0.55)", fontFamily: CARD_FONT, fontWeight: active ? 700 : 400 }}>{EL[w]}</span>
                    </button>
                  );
                })}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 3, paddingTop: 3 }}>
                  <button
                    onClick={() => {
                      setEdges((prev) => prev.filter((candidate) => candidate.id !== edge.id));
                      setSelId(picker.sourceId ?? edge.source);
                      setPicker(null);
                    }}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 11, color: "#f87171", fontFamily: CARD_FONT }}>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function GroupHalos({
  plos,
  groups,
  gc,
  pos,
  heights,
}: {
  plos: PLO[];
  groups: Record<string, number>;
  gc: number;
  pos: Record<string, { x: number; y: number }>;
  heights: Record<string, number>;
}) {
  if (Object.keys(pos).length === 0) return null;

  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {Array.from({ length: gc }, (_, i) => i + 1).map((g) => {
        const color = CLUSTER_COLORS[g - 1];
        const members = plos.filter((plo) => (groups[plo.id] ?? 1) === g && pos[plo.id]);
        if (members.length === 0) return null;

        const xs = members.map((plo) => pos[plo.id]!.x);
        const ys = members.map((plo) => pos[plo.id]!.y);
        const bottoms = members.map((plo) => pos[plo.id]!.y + (heights[plo.id] ?? MIN_NH));
        const x1 = Math.min(...xs) - 30;
        const y1 = Math.min(...ys) - 26;
        const x2 = Math.max(...xs) + NW + 30;
        const y2 = Math.max(...bottoms) + 26;

        return <rect key={g} x={x1} y={y1} width={x2 - x1} height={y2 - y1} rx={22} ry={22} fill={color} fillOpacity={0.06} stroke={color} strokeOpacity={0.18} strokeWidth={1} />;
      })}
    </svg>
  );
}
