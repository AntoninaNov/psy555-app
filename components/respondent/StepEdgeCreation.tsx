"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Edge, CLUSTER_COLORS } from "@/lib/types";
import { nanoid } from "@/lib/nanoid";
import { TutorialOverlay, EdgeCreationDemo } from "./TutorialOverlay";

const W_STROKE = [0, 2, 3.5, 5.5] as const;
const W_COLOR  = ["", "#3b82f6", "#10b981", "#f59e0b"] as const;
const W_LABEL  = ["", "Weak", "Moderate", "Strong"] as const;
const W_DESC   = ["", "loosely related", "clearly related", "very closely related"] as const;

function getEdgeBetween(edges: Edge[], a: string, b: string): Edge | undefined {
  return edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
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

  const focusPlo       = plos.find((p) => p.id === focusId);
  const focusCluster   = focusId ? clusterMap.get(focusId) : undefined;
  const focusColor     = focusCluster ? CLUSTER_COLORS[focusCluster - 1] : "var(--ink)";
  const focusEdgeCount = focusId
    ? edges.filter((e) => e.source === focusId || e.target === focusId).length
    : 0;

  const displayedPlos = useMemo(() => {
    if (!focusId) return plos;
    return plos
      .filter((p) => p.id !== focusId)
      .sort((a, b) => {
        const aC = getEdgeBetween(edges, focusId, a.id) ? 1 : 0;
        const bC = getEdgeBetween(edges, focusId, b.id) ? 1 : 0;
        if (bC !== aC) return bC - aC;
        return (clusterMap.get(a.id) ?? 99) - (clusterMap.get(b.id) ?? 99);
      });
  }, [focusId, edges, plos, clusterMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const clusteredGroups = useMemo(() => {
    const map = new Map<number, typeof plos>();
    const unassigned: typeof plos = [];
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
        body="Click any concept to focus it, then click others to mark a connection and rate its strength — weak, moderate, or strong. No right or wrong answers."
        demo={<EdgeCreationDemo />}
        onDismiss={() => setShowTutorial(false)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>

      {/* Top bar */}
      <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid var(--line)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, fontSize: 12.5, fontFamily: "'Sora', sans-serif" }}>
          {focusId ? (
            <>
              <span style={{ fontWeight: 700, color: focusColor }}>{focusPlo?.shortTitle}</span>
              <span style={{ color: "var(--text-3)", marginLeft: 8 }}>— click any concept below to draw a connection</span>
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

      {/* Focus banner */}
      {focusId && focusPlo && (
        <div style={{ flexShrink: 0, background: "var(--ink)", padding: "14px 24px", display: "flex", alignItems: "flex-start", gap: 20, borderLeft: `4px solid ${focusColor}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>SELECTED CONCEPT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif", marginBottom: 4, lineHeight: 1.2 }}>{focusPlo.shortTitle}</div>
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
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        {/* FOCUSED MODE */}
        {focusId && (
          <>
            {focusEdgeCount > 0 && (
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 10 }}>
                CONNECTED ({focusEdgeCount}) — THEN REMAINING
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 8 }}>
              {displayedPlos.map((plo) => {
                const edge        = getEdgeBetween(edges, focusId, plo.id);
                const isConnected = !!edge;
                const isExpanded  = expandedId === plo.id;
                const cluster     = clusterMap.get(plo.id);
                const dotColor    = cluster ? CLUSTER_COLORS[cluster - 1] : undefined;

                return (
                  <div key={plo.id} style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      onClick={() => handleCardClick(plo.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                        border: isConnected
                          ? `1.5px solid ${W_COLOR[edge.weight]}60`
                          : `1.5px solid ${isExpanded ? "var(--ink)" : "var(--line)"}`,
                        borderLeft: isConnected ? `4px solid ${W_COLOR[edge.weight]}` : undefined,
                        background: isConnected ? `${W_COLOR[edge.weight]}0d` : "#fff",
                        cursor: "pointer", transition: "border-color 0.12s, background 0.12s",
                        position: "relative", userSelect: "none",
                      }}
                      onMouseEnter={(e) => { if (!isConnected && !isExpanded) (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-soft)"; }}
                      onMouseLeave={(e) => { if (!isConnected && !isExpanded) (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
                    >
                      {isConnected && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                          <div style={{ width: 18, height: W_STROKE[edge.weight], background: W_COLOR[edge.weight], borderRadius: 2, opacity: 0.85, flexShrink: 0 }} />
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: W_COLOR[edge.weight], fontFamily: "'Sora', sans-serif" }}>{W_LABEL[edge.weight]}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>{plo.shortTitle}</div>
                      {dotColor && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: dotColor, opacity: 0.6 }} />}
                      {!isConnected && !isExpanded && <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, color: "var(--text-3)", opacity: 0.45 }}>+</div>}
                      {isConnected && !isExpanded && <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 9, color: "var(--text-3)" }}>✎</div>}
                    </div>

                    {isExpanded && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ border: "1.5px solid var(--ink)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px", background: "#fff", display: "flex", flexDirection: "column", gap: 7 }}
                      >
                        <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>CONNECTION STRENGTH</div>
                        <div style={{ display: "flex", gap: 5 }}>
                          {([1, 2, 3] as const).map((w) => {
                            const active = edge?.weight === w;
                            return (
                              <button key={w} onClick={() => handleSetStrength(plo.id, w)}
                                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 7, outline: "none", cursor: "pointer", border: `2px solid ${active ? W_COLOR[w] : "var(--line)"}`, background: active ? `${W_COLOR[w]}14` : "#fff", transition: "all 0.12s" }}
                                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = W_COLOR[w]; e.currentTarget.style.background = `${W_COLOR[w]}0A`; } }}
                                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "#fff"; } }}
                              >
                                <div style={{ width: "55%", height: W_STROKE[w] * 2, background: W_COLOR[w], borderRadius: 2, opacity: 0.85 }} />
                                <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, color: active ? W_COLOR[w] : "var(--text-2)", fontFamily: "'Sora', sans-serif" }}>{W_LABEL[w]}</span>
                                <span style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Sora', sans-serif" }}>{W_DESC[w]}</span>
                              </button>
                            );
                          })}
                        </div>
                        {isConnected && (
                          <button onClick={() => handleRemove(plo.id)}
                            style={{ padding: "5px", borderRadius: 6, border: "1px solid #fca5a5", background: "transparent", color: "#b91c1c", fontSize: 10, cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >Remove connection</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* UNFOCUSED MODE: grouped by cluster */}
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
                    {group.map((plo) => {
                      const connCount = edges.filter((e) => e.source === plo.id || e.target === plo.id).length;
                      return (
                        <div key={plo.id} onClick={() => handleCardClick(plo.id)}
                          style={{ padding: "11px 12px", borderRadius: 10, border: connCount > 0 ? `1.5px solid ${color}50` : "1.5px solid var(--line)", borderLeft: connCount > 0 ? `4px solid ${color}` : undefined, background: connCount > 0 ? `${color}08` : "#fff", cursor: "pointer", transition: "border-color 0.12s", position: "relative", userSelect: "none" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = connCount > 0 ? `${color}50` : "var(--line)"; }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>{plo.shortTitle}</div>
                          {connCount > 0 && (
                            <div style={{ position: "absolute", top: 7, right: 8, fontSize: 9, fontFamily: "'Fira Code', monospace", background: "var(--ink-pale)", color: "var(--text-2)", borderRadius: 10, padding: "1px 6px" }}>{connCount}</div>
                          )}
                        </div>
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
