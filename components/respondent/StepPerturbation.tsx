"use client";
import { useState, useMemo, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { CLUSTER_COLORS } from "@/lib/types";
import { selectPerturbationScenario, computeBridgeAccuracy } from "@/lib/metrics";

export function StepPerturbation() {
  const { session, setPerturbationResult, setRespondentStep, recordStepExit } = useAppStore();
  const plos  = session?.normalizedPLOs ?? [];
  const nodes = session?.respondentData?.nodes ?? [];
  const edges = session?.respondentData?.edges ?? [];

  const startMs = useRef(Date.now());

  const clusterMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nodes) if (n.cluster) m.set(n.id, n.cluster);
    return m;
  }, [nodes]);

  const scenario = useMemo(() => selectPerturbationScenario(plos, edges), [plos, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const [chosenId, setChosenId] = useState<string | null>(null);

  function proceed(skip = false) {
    recordStepExit("perturbation");
    if (!skip && scenario && chosenId) {
      const accuracy = computeBridgeAccuracy(chosenId, scenario.neighborIds, edges);
      setPerturbationResult({
        removedId:      scenario.removedId,
        bridgeChoiceId: chosenId,
        bridgeAccuracy: accuracy,
        timeMs:         Date.now() - startMs.current,
      });
    }
    setRespondentStep("complete");
  }

  if (!scenario) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🔄</div>
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Not enough data for this task</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", maxWidth: 400, lineHeight: 1.65, marginBottom: 28 }}>
          The adaptation task needs at least one concept with two or more connections.
        </p>
        <button onClick={() => proceed(true)} className="btn btn-primary" style={{ fontSize: 13, padding: "10px 28px" }}>Continue →</button>
      </div>
    );
  }

  const removedPlo     = plos.find((p) => p.id === scenario.removedId);
  const removedCluster = clusterMap.get(scenario.removedId);
  const removedColor   = removedCluster ? CLUSTER_COLORS[removedCluster - 1] : "var(--rust)";

  // Candidate concepts = everyone except the removed node
  const candidates = plos.filter((p) => p.id !== scenario.removedId);

  // Group candidates by cluster
  const groups = useMemo(() => {
    const map = new Map<number, typeof candidates>();
    const unassigned: typeof candidates = [];
    for (const p of candidates) {
      const c = clusterMap.get(p.id);
      if (c) { if (!map.has(c)) map.set(c, []); map.get(c)!.push(p); }
      else unassigned.push(p);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a - b);
    if (unassigned.length) sorted.push([0, unassigned]);
    return sorted;
  }, [candidates, clusterMap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: "var(--rust)", fontFamily: "'Fira Code', monospace", marginBottom: 8 }}>
          ADAPTATION TASK
        </div>
        <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 8, lineHeight: 1.2 }}>
          The knowledge landscape has shifted
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>
          Imagine the concept below has been removed from the curriculum entirely.
          Which remaining concept would best bridge the gap it leaves behind?
        </p>
      </div>

      {/* Disrupted concept */}
      <div style={{
        background: "var(--rust-pale)", border: `2px solid var(--rust)`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 28,
        display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>⚡</div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", fontFamily: "'Fira Code', monospace", color: "var(--rust)", marginBottom: 4, fontWeight: 600 }}>DISRUPTED CONCEPT</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--rust)", fontFamily: "'Sora', sans-serif", marginBottom: 4, lineHeight: 1.2, textDecoration: "line-through", textDecorationColor: "var(--rust)", opacity: 0.75 }}>
            {removedPlo?.shortTitle}
          </div>
          <div style={{ fontSize: 12, color: "var(--rust)", opacity: 0.65, fontFamily: "'Sora', sans-serif", lineHeight: 1.5 }}>
            {removedPlo?.paraphrase}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--rust)", fontFamily: "'Fira Code', monospace", marginTop: 8, opacity: 0.7 }}>
            was connected to {scenario.neighborIds.length} concept{scenario.neighborIds.length !== 1 ? "s" : ""} in your map
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", marginBottom: 16 }}>
        Which concept would best bridge the gap left by <em>{removedPlo?.shortTitle}</em>?
      </div>

      {/* Candidate grid */}
      <div style={{ marginBottom: 28 }}>
        {groups.map(([cid, group]) => {
          const color = cid > 0 ? CLUSTER_COLORS[cid - 1] : "var(--text-3)";
          return (
            <div key={cid} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 8.5, color: "var(--text-3)", fontFamily: "'Fira Code', monospace", fontWeight: 600, letterSpacing: "0.06em" }}>
                  {cid > 0 ? `GROUP ${cid}` : "UNASSIGNED"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 7 }}>
                {group.map((p) => {
                  const chosen = chosenId === p.id;
                  return (
                    <div key={p.id} onClick={() => setChosenId(chosen ? null : p.id)}
                      style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        border: chosen ? `2px solid ${color}` : "1.5px solid var(--line)",
                        background: chosen ? `${color}14` : "#fff",
                        transition: "all 0.12s", userSelect: "none",
                      }}
                      onMouseEnter={(e) => { if (!chosen) (e.currentTarget as HTMLElement).style.borderColor = color; }}
                      onMouseLeave={(e) => { if (!chosen) (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
                    >
                      {chosen && (
                        <div style={{ fontSize: 9, fontWeight: 700, color, fontFamily: "'Fira Code', monospace", marginBottom: 3 }}>SELECTED ✓</div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                        {p.shortTitle}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => proceed(true)}
          style={{ fontSize: 12, padding: "9px 20px", borderRadius: 9, border: "1px solid var(--line)", background: "#fff", color: "var(--text-2)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
          Skip task
        </button>
        <button onClick={() => proceed(false)} className="btn btn-primary"
          style={{ fontSize: 13, padding: "9px 24px", opacity: !chosenId ? 0.6 : 1 }}>
          Submit answer →
        </button>
      </div>
    </div>
  );
}
