"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { CLUSTER_COLORS, PLO, Edge, CanvasNode } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";

// ─── Visual config ────────────────────────────────────────────────────────────
const NW = 142; // node width
const NH = 40;  // node height
const MAX_G = 5;
const EC = { 1: "#64748b", 2: "#60a5fa", 3: "#fbbf24" } as const;
const EW = { 1: 1.5,      2: 2.5,      3: 4.0      } as const;
const EL = { 1: "Distant", 2: "Nearby", 3: "Adjacent" } as const;

// ─── Layout helpers ───────────────────────────────────────────────────────────

function initGroups(plos: PLO[], n: number): Record<string, number> {
  const g: Record<string, number> = {};
  plos.forEach((p, i) => { g[p.id] = (i % n) + 1; });
  return g;
}

function computeLayout(
  plos: PLO[],
  groups: Record<string, number>,
  gc: number,
  W: number,
  H: number,
): Record<string, { x: number; y: number }> {
  const pad = 95, iw = W - pad * 2, ih = H - pad * 2;
  const C: { x: number; y: number }[] = {
    1: [{ x: W / 2, y: H / 2 }],
    2: [{ x: pad + iw * 0.22, y: H / 2 }, { x: pad + iw * 0.78, y: H / 2 }],
    3: [
      { x: pad + iw * 0.2,  y: pad + ih * 0.28 },
      { x: pad + iw * 0.8,  y: pad + ih * 0.28 },
      { x: pad + iw * 0.5,  y: pad + ih * 0.78 },
    ],
    4: [
      { x: pad + iw * 0.23, y: pad + ih * 0.26 }, { x: pad + iw * 0.77, y: pad + ih * 0.26 },
      { x: pad + iw * 0.23, y: pad + ih * 0.77 }, { x: pad + iw * 0.77, y: pad + ih * 0.77 },
    ],
    5: [
      { x: pad + iw * 0.14, y: pad + ih * 0.22 }, { x: pad + iw * 0.5, y: pad + ih * 0.12 },
      { x: pad + iw * 0.86, y: pad + ih * 0.22 },
      { x: pad + iw * 0.3,  y: pad + ih * 0.78 }, { x: pad + iw * 0.7, y: pad + ih * 0.78 },
    ],
  }[gc] ?? [];

  const byG = new Map<number, PLO[]>();
  for (let g = 1; g <= gc; g++) byG.set(g, []);
  plos.forEach(p => {
    const g = groups[p.id] ?? 1;
    if (!byG.has(g)) byG.set(g, []);
    byG.get(g)!.push(p);
  });

  const pos: Record<string, { x: number; y: number }> = {};
  byG.forEach((members, gId) => {
    const c = C[(gId - 1) % C.length] ?? { x: W / 2, y: H / 2 };
    const cols = Math.min(2, members.length);
    const sx = NW + 18, sy = NH + 16;
    members.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      pos[p.id] = {
        x: Math.max(4, Math.min(W - NW - 4,
          c.x - NW / 2 + (col - (cols - 1) / 2) * sx)),
        y: Math.max(4, Math.min(H - NH - 4,
          c.y - NH / 2 + (row - (Math.ceil(members.length / cols) - 1) / 2) * sy)),
      };
    });
  });
  return pos;
}

function getEdge(edges: Edge[], a: string, b: string) {
  return edges.find(e =>
    (e.source === a && e.target === b) || (e.source === b && e.target === a),
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepConceptMap() {
  const { session, setNodes, setEdges: saveEdges, setRespondentStep, recordStepExit } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];

  // Canvas dimensions via ResizeObserver
  const cvRef = useRef<HTMLDivElement>(null);
  const [cs, setCs] = useState({ w: 900, h: 480 });
  useEffect(() => {
    const el = cvRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setCs({ w: r.width, h: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Pre-load from store if the user is returning to this step after having done it before
  const storedNodes = session?.respondentData?.nodes ?? [];
  const storedEdges = session?.respondentData?.edges ?? [];
  const hasStored   = storedNodes.length > 0;

  const [gc, setGc] = useState(() => {
    if (hasStored) {
      const clusters = new Set(storedNodes.map(n => n.cluster ?? 1));
      return Math.max(clusters.size, 2);
    }
    return 3;
  });

  const [groups, setGroups] = useState<Record<string, number>>(() => {
    if (hasStored) {
      const g: Record<string, number> = {};
      storedNodes.forEach(n => { g[n.id] = n.cluster ?? 1; });
      return g;
    }
    return initGroups(plos, 3);
  });

  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() => {
    if (hasStored) {
      const p: Record<string, { x: number; y: number }> = {};
      storedNodes.forEach(n => { p[n.id] = { x: n.x, y: n.y }; });
      return p;
    }
    return {};
  });

  const [edges,  setEdges]  = useState<Edge[]>(hasStored ? storedEdges : []);
  const [selId,  setSelId]  = useState<string | null>(null);
  const [paintG, setPaintG] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ id: string; x: number; y: number } | null>(null);

  // Init layout once canvas size is known (skip if pre-loaded from store)
  const inited = useRef(hasStored);
  useEffect(() => {
    if (cs.w < 100 || inited.current) return;
    inited.current = true;
    setPos(computeLayout(plos, groups, gc, cs.w, cs.h));
  }, [cs.w]); // eslint-disable-line react-hooks/exhaustive-deps

  function relayout(newGc?: number, newGroups?: Record<string, number>) {
    const g = newGroups ?? groups;
    const n = newGc ?? gc;
    setPos(computeLayout(plos, g, n, cs.w, cs.h));
  }

  // ── Drag ────────────────────────────────────────────────────────────────────
  const drag    = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const dragged = useRef(false);

  // Mirror of current state for use in window event listeners
  const SR = useRef({ selId, groups, edges, paintG, pos, cs });
  SR.current = { selId, groups, edges, paintG, pos, cs };

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current) return;
      const { id, sx, sy, ox, oy } = drag.current;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged.current = true;
      if (!dragged.current) return;
      const { cs: { w, h } } = SR.current;
      setPos(p => ({
        ...p,
        [id]: { x: Math.max(0, Math.min(w - NW, ox + dx)), y: Math.max(0, Math.min(h - NH, oy + dy)) },
      }));
    }

    function onUp() {
      if (!drag.current) return;
      const { id } = drag.current;
      drag.current = null;
      if (!dragged.current) handleClick(id);
      dragged.current = false;
    }

    // Click logic lives here so it sees latest state via SR
    function handleClick(id: string) {
      const { selId, paintG, edges, pos } = SR.current;
      setPicker(null);

      // Paint mode: move concept to active group
      if (paintG !== null) {
        setGroups(g => ({ ...g, [id]: paintG }));
        return;
      }

      // No selection → select this node
      if (!selId) { setSelId(id); return; }

      // Re-click selected node → deselect
      if (selId === id) { setSelId(null); return; }

      // Second node clicked → connect or open edge picker
      const ex = getEdge(edges, selId, id);
      if (ex) {
        const a = pos[selId], b = pos[id];
        if (a && b) setPicker({
          id: ex.id,
          x: (a.x + NW / 2 + b.x + NW / 2) / 2,
          y: (a.y + NH / 2 + b.y + NH / 2) / 2,
        });
      } else {
        setEdges(prev => [...prev, { id: nanoid(), source: selId, target: id, weight: 1 }]);
      }
      setSelId(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finish ───────────────────────────────────────────────────────────────────
  function finish() {
    // Auto-detect anchor (most connected node per group)
    const conn: Record<string, number> = {};
    edges.forEach(e => {
      conn[e.source] = (conn[e.source] ?? 0) + 1;
      conn[e.target] = (conn[e.target] ?? 0) + 1;
    });
    const anchor: Record<number, string> = {};
    for (let g = 1; g <= gc; g++) {
      const m = plos.filter(p => (groups[p.id] ?? 1) === g);
      if (m.length) anchor[g] = m.sort((a, b) => (conn[b.id] ?? 0) - (conn[a.id] ?? 0))[0].id;
    }
    const nodes: CanvasNode[] = plos.map(p => ({
      id: p.id,
      x: pos[p.id]?.x ?? 0,
      y: pos[p.id]?.y ?? 0,
      cluster: groups[p.id] ?? 1,
      isCentral: anchor[groups[p.id] ?? 1] === p.id,
    }));
    setNodes(nodes);
    saveEdges(edges);
    recordStepExit("clustering");
    setRespondentStep("metadata");
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0b1a27", color: "#fff", fontFamily: "'Sora', sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: "rgba(11,26,39,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>

        {/* Context hint */}
        <div style={{ flex: 1, fontSize: 11.5, minWidth: 0 }}>
          {selId
            ? <><span style={{ color: "#fff", fontWeight: 700 }}>Click another concept</span><span style={{ color: "rgba(255,255,255,0.35)" }}> to connect · or click the map to cancel</span></>
            : paintG !== null
            ? <><span style={{ color: CLUSTER_COLORS[paintG - 1], fontWeight: 700 }}>Paint mode on</span><span style={{ color: "rgba(255,255,255,0.35)" }}> — click concepts to move them to this group · click the colour again to stop</span></>
            : <span style={{ color: "rgba(255,255,255,0.35)" }}>Select a concept to connect · drag to move · click a connection dot to set how close they are</span>
          }
        </div>

        {/* Group palette */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {Array.from({ length: gc }, (_, i) => i + 1).map(g => {
            const c = CLUSTER_COLORS[g - 1];
            const cnt = plos.filter(p => (groups[p.id] ?? 1) === g).length;
            const active = paintG === g;
            return (
              <button key={g}
                onClick={() => { setPaintG(p => p === g ? null : g); setSelId(null); setPicker(null); }}
                title={`Group ${g} — click to paint concepts into this group`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${active ? c : "rgba(255,255,255,0.08)"}`, background: active ? `${c}20` : `${c}10`, cursor: "pointer", transition: "all 0.15s" }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: active ? `0 0 0 2px ${c}40` : "none" }} />
                <span style={{ fontSize: 9.5, color: active ? c : "rgba(255,255,255,0.45)", fontFamily: "'Fira Code', monospace" }}>{cnt}</span>
              </button>
            );
          })}
          {gc < MAX_G && (
            <button
              onClick={() => { const n = gc + 1; const ng = initGroups(plos, n); setGc(n); setGroups(ng); relayout(n, ng); }}
              title="Add a group"
              style={{ padding: "5px 9px", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
            >+</button>
          )}
        </div>

        {/* Edge legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, opacity: 0.5 }}>
          {([1, 2, 3] as const).map(w => (
            <div key={w} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 14, height: EW[w] * 2, background: EC[w], borderRadius: 2 }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>{EL[w]}</span>
            </div>
          ))}
        </div>

        {/* Tidy button */}
        <button
          onClick={() => relayout()}
          title="Re-arrange nodes by group"
          style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 10.5, flexShrink: 0, transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >⟳ Tidy</button>

        {/* Link count */}
        {edges.length > 0 && (
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", fontFamily: "'Fira Code', monospace", flexShrink: 0 }}>
            {edges.length} link{edges.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Done */}
        <button
          onClick={finish}
          style={{ padding: "7px 18px", borderRadius: 9, background: "#C84B1C", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >Done →</button>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={cvRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onClick={e => {
          const t = e.target as Element;
          if (!t.closest("[data-node]") && !t.closest("[data-picker]")) {
            setSelId(null); setPaintG(null); setPicker(null);
          }
        }}
      >
        {/* Group background halos */}
        <GroupHalos plos={plos} groups={groups} gc={gc} pos={pos} />

        {/* SVG edge layer */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          onClick={e => e.stopPropagation()}
        >
          {edges.map(edge => {
            const a = pos[edge.source], b = pos[edge.target];
            if (!a || !b) return null;
            const ax = a.x + NW / 2, ay = a.y + NH / 2;
            const bx = b.x + NW / 2, by = b.y + NH / 2;
            const mx = (ax + bx) / 2, my = (ay + by) / 2;
            const c = EC[edge.weight], w = EW[edge.weight];
            const open = picker?.id === edge.id;

            return (
              <g key={edge.id}>
                {/* Wide invisible click target on the line */}
                <line x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="transparent" strokeWidth={22}
                  style={{ cursor: "pointer", pointerEvents: "stroke" }}
                  onClick={ev => { ev.stopPropagation(); setPicker(p => p?.id === edge.id ? null : { id: edge.id, x: mx, y: my }); }}
                />
                {/* Visible line */}
                <line x1={ax} y1={ay} x2={bx} y2={by}
                  stroke={c} strokeWidth={w} strokeOpacity={open ? 0.9 : 0.45} strokeLinecap="round"
                />
                {/* Midpoint dot — click to rate strength */}
                <circle cx={mx} cy={my} r={open ? 7 : 4.5}
                  fill={open ? c : "#0b1a27"} stroke={c} strokeWidth={1.5}
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  onClick={ev => { ev.stopPropagation(); setPicker(p => p?.id === edge.id ? null : { id: edge.id, x: mx, y: my }); }}
                />
              </g>
            );
          })}
        </svg>

        {/* Concept nodes */}
        {plos.map(plo => {
          const p = pos[plo.id];
          if (!p) return null;
          const g = groups[plo.id] ?? 1;
          const c = CLUSTER_COLORS[g - 1];
          const sel = selId === plo.id;
          const isPaintTarget = paintG !== null && paintG !== g;
          const conn = edges.filter(e => e.source === plo.id || e.target === plo.id).length;

          return (
            <div
              key={plo.id}
              data-node="true"
              onPointerDown={e => {
                e.stopPropagation();
                dragged.current = false;
                drag.current = { id: plo.id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
              }}
              style={{
                position: "absolute",
                left: p.x, top: p.y,
                width: NW, height: NH,
                background: sel ? `${c}25` : "rgba(255,255,255,0.055)",
                border: `1.5px solid ${sel ? c : `${c}55`}`,
                borderLeft: `3px solid ${c}`,
                borderRadius: 8,
                cursor: "grab",
                display: "flex", alignItems: "center",
                padding: "0 8px 0 10px", gap: 6,
                boxShadow: sel
                  ? `0 0 0 3px ${c}35, 0 4px 20px rgba(0,0,0,0.5)`
                  : "0 2px 8px rgba(0,0,0,0.4)",
                transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s, opacity 0.15s",
                zIndex: sel ? 10 : 2,
                opacity: isPaintTarget ? 0.4 : 1,
                touchAction: "none",
              }}
            >
              <span style={{
                fontSize: 11.5, fontWeight: 600,
                color: sel ? "#fff" : "rgba(255,255,255,0.82)",
                lineHeight: 1.25, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                pointerEvents: "none",
              }}>
                {plo.shortTitle}
              </span>
              {conn > 0 && (
                <span style={{ fontSize: 9, color: `${c}bb`, fontFamily: "'Fira Code', monospace", flexShrink: 0, pointerEvents: "none" }}>
                  {conn}
                </span>
              )}
            </div>
          );
        })}

        {/* Edge strength picker */}
        {picker && (() => {
          const edge = edges.find(e => e.id === picker.id);
          if (!edge) return null;
          const px = Math.max(8, Math.min(cs.w - 192, picker.x - 82));
          const py = Math.max(8, Math.min(cs.h - 158, picker.y - 108));
          return (
            <div
              data-picker="true"
              onClick={e => e.stopPropagation()}
              style={{
                position: "absolute", left: px, top: py, zIndex: 30,
                background: "#162539", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.65)", width: 172,
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.08em", color: "rgba(255,255,255,0.28)", fontFamily: "'Fira Code', monospace", marginBottom: 8 }}>HOW CLOSE ARE THESE CONCEPTS?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {([1, 2, 3] as const).map(w => {
                  const active = edge.weight === w;
                  const c = EC[w];
                  return (
                    <button key={w}
                      onClick={() => { setEdges(prev => prev.map(e => e.id === edge.id ? { ...e, weight: w } : e)); setPicker(null); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${active ? c : "transparent"}`, background: active ? `${c}18` : "transparent", cursor: "pointer", transition: "all 0.1s" }}
                    >
                      <div style={{ width: 20, height: EW[w] * 2, background: c, borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: active ? c : "rgba(255,255,255,0.55)", fontFamily: "'Sora', sans-serif", fontWeight: active ? 700 : 400 }}>{EL[w]}</span>
                    </button>
                  );
                })}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 3, paddingTop: 3 }}>
                  <button
                    onClick={() => { setEdges(prev => prev.filter(e => e.id !== edge.id)); setPicker(null); }}
                    style={{ padding: "6px 10px", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 11, color: "#f87171", fontFamily: "'Sora', sans-serif" }}>Remove</span>
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

// ─── Group background halos ───────────────────────────────────────────────────

function GroupHalos({
  plos, groups, gc, pos,
}: {
  plos: PLO[];
  groups: Record<string, number>;
  gc: number;
  pos: Record<string, { x: number; y: number }>;
}) {
  if (Object.keys(pos).length === 0) return null;
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {Array.from({ length: gc }, (_, i) => i + 1).map(g => {
        const c = CLUSTER_COLORS[g - 1];
        const members = plos.filter(p => (groups[p.id] ?? 1) === g && pos[p.id]);
        if (members.length === 0) return null;
        const xs = members.map(p => pos[p.id]!.x);
        const ys = members.map(p => pos[p.id]!.y);
        const x1 = Math.min(...xs) - 30, y1 = Math.min(...ys) - 26;
        const x2 = Math.max(...xs) + NW + 30, y2 = Math.max(...ys) + NH + 26;
        return (
          <rect key={g}
            x={x1} y={y1} width={x2 - x1} height={y2 - y1}
            rx={22} ry={22}
            fill={c} fillOpacity={0.06}
            stroke={c} strokeOpacity={0.18} strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}
