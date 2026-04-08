"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { CLUSTER_COLORS } from "@/lib/types";
import { selectPathfindingPair, validatePath } from "@/lib/metrics";

export function StepPathfinding() {
  const { session, setPathfindingResult, setRespondentStep, recordStepExit } = useAppStore();
  const plos  = session?.normalizedPLOs ?? [];
  const nodes = session?.respondentData?.nodes ?? [];
  const edges = session?.respondentData?.edges ?? [];

  const startMs = useRef(Date.now());

  const clusterMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.cluster) m.set(n.id, n.cluster);
    return m;
  }, [nodes]);

  // Pick source/target pair once
  const scenario = useMemo(() => selectPathfindingPair(plos, edges), [plos, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const [path, setPath] = useState<string[]>(() =>
    scenario ? [scenario.sourceId] : []
  );

  useEffect(() => {
    if (scenario) setPath([scenario.sourceId]);
  }, [scenario?.sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  function proceed(skip = false) {
    recordStepExit("pathfinding");
    if (!skip && scenario && path.length >= 2) {
      const finalPath = path[path.length - 1] !== scenario.targetId
        ? [...path, scenario.targetId]
        : path;
      const hops = finalPath.length - 1;
      const accuracy = Math.min(1, scenario.optimalLength / Math.max(hops, 1));
      setPathfindingResult({
        sourceId:      scenario.sourceId,
        targetId:      scenario.targetId,
        chosenPath:    finalPath,
        optimalLength: scenario.optimalLength,
        accuracy:      Math.round(accuracy * 100) / 100,
        timeMs:        Date.now() - startMs.current,
      });
    }
    setRespondentStep("perturbation");
  }

  // ── No usable scenario ──────────────────────────────────────────────────────

  if (!scenario) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🗺️</div>
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Not enough connections for this task</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", maxWidth: 400, lineHeight: 1.65, marginBottom: 28 }}>
          The pathfinding task needs at least two connected concepts with an intermediate step. Skip ahead to the next task.
        </p>
        <button onClick={() => proceed(true)} className="btn btn-primary" style={{ fontSize: 13, padding: "10px 28px" }}>
          Continue →
        </button>
      </div>
    );
  }

  const srcPlo = plos.find((p) => p.id === scenario.sourceId);
  const tgtPlo = plos.find((p) => p.id === scenario.targetId);

  const edgeSet = new Set(edges.flatMap((e) => [`${e.source}:${e.target}`, `${e.target}:${e.source}`]));
  function isConnected(a: string, b: string) { return edgeSet.has(`${a}:${b}`); }

  function addToPath(ploId: string) {
    if (path.includes(ploId)) {
      // Remove this node and everything after it
      setPath((prev) => prev.slice(0, prev.indexOf(ploId)));
      return;
    }
    setPath((prev) => [...prev, ploId]);
  }

  const pathComplete = path[path.length - 1] === scenario.targetId && path.length >= 2;
  const intermediates = plos.filter((p) => p.id !== scenario.sourceId && p.id !== scenario.targetId);
  const inPath = new Set(path);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 8 }}>
          NAVIGATION TASK
        </div>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 8, lineHeight: 1.2 }}>
          Trace a path through your knowledge map
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>
          Connect <strong style={{ color: "var(--ink)" }}>{srcPlo?.shortTitle}</strong> to <strong style={{ color: "var(--ink)" }}>{tgtPlo?.shortTitle}</strong> by clicking intermediate concepts below.
          Use the route that feels most natural given your connections.
        </p>
      </div>

      {/* Path chain */}
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "20px", marginBottom: 24, boxShadow: "var(--sh-sm)" }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 12 }}>YOUR PATH</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          {path.map((id, i) => {
            const plo      = plos.find((p) => p.id === id);
            const cluster  = clusterMap.get(id);
            const color    = cluster ? CLUSTER_COLORS[cluster - 1] : "var(--ink)";
            const isSource = id === scenario.sourceId;
            const isTgt    = id === scenario.targetId;
            const prevId   = path[i - 1];
            const linked   = prevId ? isConnected(prevId, id) : true;

            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {i > 0 && (
                  <div style={{ fontSize: 14, color: linked ? "#10b981" : "#ef4444", fontWeight: 700, flexShrink: 0 }}>
                    {linked ? "→" : "✕"}
                  </div>
                )}
                <div style={{
                  padding: "5px 12px", borderRadius: 20,
                  background: isSource || isTgt ? "var(--ink)" : `${color}18`,
                  border: `1.5px solid ${isSource || isTgt ? "var(--ink)" : color}`,
                  fontSize: 11.5, fontWeight: 600,
                  color: isSource || isTgt ? "#fff" : color,
                  fontFamily: "'Sora', sans-serif",
                  cursor: !isSource && !isTgt ? "pointer" : "default",
                }}
                onClick={() => { if (!isSource && !isTgt) addToPath(id); }}
                title={!isSource && !isTgt ? "Click to remove" : undefined}
                >
                  {plo?.shortTitle ?? id}
                </div>
              </div>
            );
          })}

          {/* Target placeholder */}
          {path[path.length - 1] !== scenario.targetId && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 14, color: "var(--line)", fontWeight: 700 }}>→</div>
              <div style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px dashed var(--line)", fontSize: 11.5, color: "var(--text-3)", fontFamily: "'Sora', sans-serif", background: "var(--bg)" }}>
                {tgtPlo?.shortTitle}
              </div>
            </div>
          )}
        </div>

        {pathComplete && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: "#10b981", fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>
            ✓ Path complete — {path.length - 1} hop{path.length > 2 ? "s" : ""}
            {!validatePath(path, edges) && (
              <span style={{ color: "#f59e0b", fontWeight: 400, marginLeft: 10 }}>
                (some steps may not be directly connected in your map)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Intermediate concept chips */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 10 }}>
          INTERMEDIATE CONCEPTS — click to add to path · click again to remove
        </div>

        {/* Group by cluster */}
        {(() => {
          const groups = new Map<number, typeof intermediates>();
          const unassigned: typeof intermediates = [];
          for (const p of intermediates) {
            const c = clusterMap.get(p.id);
            if (c) { if (!groups.has(c)) groups.set(c, []); groups.get(c)!.push(p); }
            else unassigned.push(p);
          }
          const sorted = [...groups.entries()].sort(([a], [b]) => a - b);
          if (unassigned.length) sorted.push([0, unassigned]);

          return sorted.map(([cid, group]) => {
            const color = cid > 0 ? CLUSTER_COLORS[cid - 1] : "var(--text-3)";
            return (
              <div key={cid} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 8.5, color: "var(--text-3)", fontFamily: "'Fira Code', monospace", fontWeight: 600, letterSpacing: "0.06em" }}>
                    {cid > 0 ? `GROUP ${cid}` : "UNASSIGNED"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {group.map((p) => {
                    const active = inPath.has(p.id);
                    return (
                      <button key={p.id} onClick={() => addToPath(p.id)}
                        style={{
                          padding: "5px 12px", borderRadius: 16, fontSize: 11.5,
                          border: `1.5px solid ${active ? color : "var(--line)"}`,
                          background: active ? `${color}18` : "#fff",
                          color: active ? color : "var(--text-2)",
                          fontWeight: active ? 700 : 400,
                          cursor: "pointer", fontFamily: "'Sora', sans-serif",
                          transition: "all 0.12s",
                        }}
                      >{p.shortTitle}</button>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => proceed(true)}
          style={{ fontSize: 12, padding: "9px 20px", borderRadius: 9, border: "1px solid var(--line)", background: "#fff", color: "var(--text-2)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
          Skip task
        </button>
        <button onClick={() => proceed(false)} className="btn btn-primary"
          style={{ fontSize: 13, padding: "9px 24px", opacity: path.length < 2 ? 0.6 : 1 }}>
          Submit path →
        </button>
      </div>
    </div>
  );
}
