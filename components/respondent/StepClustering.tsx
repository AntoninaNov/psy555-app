"use client";
import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { PLO, CanvasNode, CLUSTER_COLORS } from "@/lib/types";
import { TutorialOverlay, ClusteringDemo } from "./TutorialOverlay";

const MAX_CLUSTERS = 5;

// ── Canvas layout ─────────────────────────────────────────────────────────────

function assignClusteredPositions(
  plos: PLO[],
  assignments: Record<string, number>,
  centrals: Set<string>,
): CanvasNode[] {
  const clusters = new Map<number, string[]>();
  for (const plo of plos) {
    const c = assignments[plo.id] ?? 1;
    if (!clusters.has(c)) clusters.set(c, []);
    clusters.get(c)!.push(plo.id);
  }
  const clusterIds = [...clusters.keys()].sort((a, b) => a - b);
  const cols = Math.min(clusterIds.length, Math.ceil(Math.sqrt(clusterIds.length)));
  const REGION_W = 620, REGION_H = 440, CARD_COLS = 2;
  const CARD_SPACE_X = 270, CARD_SPACE_Y = 160;
  const result: CanvasNode[] = [];
  clusterIds.forEach((clusterId, ci) => {
    const col = ci % cols, row = Math.floor(ci / cols);
    const originX = col * REGION_W + 100, originY = row * REGION_H + 120;
    clusters.get(clusterId)!.forEach((id, i) => {
      result.push({
        id, cluster: clusterId, isCentral: centrals.has(id),
        x: originX + 40 + (i % CARD_COLS) * CARD_SPACE_X + (Math.random() - 0.5) * 20,
        y: originY + 50 + Math.floor(i / CARD_COLS) * CARD_SPACE_Y + (Math.random() - 0.5) * 20,
      });
    });
  });
  return result;
}

function groupLetter(c: number) { return String.fromCharCode(64 + c); }

// ── Main ──────────────────────────────────────────────────────────────────────

export function StepClustering() {
  const { session, setNodes, setRespondentStep, recordStepExit } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];

  const [showTutorial,   setShowTutorial]   = useState(true);
  const [phase,          setPhase]          = useState<"paint" | "anchor">("paint");
  const [activeCluster,  setActiveCluster]  = useState(1);
  const [clusterCount,   setClusterCount]   = useState(3);
  const [assignments,    setAssignments]    = useState<Record<string, number>>({});
  const [centrals,       setCentrals]       = useState<Record<number, string>>({});
  const [anchorGroupIdx, setAnchorGroupIdx] = useState(0);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);

  const assignedCount = Object.keys(assignments).length;
  const allPainted    = assignedCount === plos.length;
  const usedGroups    = useMemo(
    () => [...new Set(Object.values(assignments))].sort((a, b) => a - b),
    [assignments],
  );
  const canAdvance = allPainted && usedGroups.length >= 2;

  // ── Paint phase handlers ───────────────────────────────────────────────────

  function paintCard(ploId: string) {
    setAssignments((prev) => {
      if (prev[ploId] === activeCluster) {
        const next = { ...prev };
        delete next[ploId];
        return next;
      }
      return { ...prev, [ploId]: activeCluster };
    });
  }

  function addGroup() {
    if (clusterCount >= MAX_CLUSTERS) return;
    const next = clusterCount + 1;
    setClusterCount(next);
    setActiveCluster(next);
  }

  // ── Anchor phase handlers ──────────────────────────────────────────────────

  function selectAnchor(groupId: number, ploId: string) {
    setCentrals((prev) =>
      prev[groupId] === ploId
        ? (({ [groupId]: _, ...rest }) => rest)(prev)
        : { ...prev, [groupId]: ploId }
    );
  }

  function nextAnchorGroup() {
    if (anchorGroupIdx < usedGroups.length - 1) {
      setAnchorGroupIdx((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    const centralSet = new Set(Object.values(centrals));
    setNodes(assignClusteredPositions(plos, assignments, centralSet));
    recordStepExit("clustering");
    setRespondentStep("edge_creation");
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────

  if (showTutorial) {
    return (
      <TutorialOverlay
        title="Sort concepts into groups"
        body="Pick a group colour, then click concepts to assign them. When everything is sorted you'll pick one anchor — the concept that best represents each group."
        demo={<ClusteringDemo />}
        onDismiss={() => setShowTutorial(false)}
      />
    );
  }

  // ── Anchor phase ───────────────────────────────────────────────────────────

  if (phase === "anchor") {
    const groupId      = usedGroups[anchorGroupIdx];
    const color        = CLUSTER_COLORS[groupId - 1];
    const groupPlos    = plos.filter((p) => assignments[p.id] === groupId);
    const selectedId   = centrals[groupId];
    const isLast       = anchorGroupIdx === usedGroups.length - 1;

    return (
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 0 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em",
            color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 7,
          }}>
            STEP 2 OF 2 · GROUP {anchorGroupIdx + 1} OF {usedGroups.length}
          </div>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            Which concept anchors this group?
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 480 }}>
            Pick the one concept that best represents the group — the idea that sits at the centre of everything else in it. You can skip if none feels central.
          </p>
        </div>

        {/* Group pill + dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px",
            borderRadius: 24,
            background: `${color}14`,
            border: `2px solid ${color}`,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'Sora', sans-serif" }}>
              Group {groupLetter(groupId)} · {groupPlos.length} concepts
            </span>
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {usedGroups.map((gId, i) => (
              <div key={gId} style={{
                width:        i === anchorGroupIdx ? 24 : 8,
                height:       8,
                borderRadius: 4,
                background:   i === anchorGroupIdx ? CLUSTER_COLORS[gId - 1]
                            : i < anchorGroupIdx   ? `${CLUSTER_COLORS[gId - 1]}70`
                            : "var(--line)",
                transition:   "all 0.2s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 36,
        }}>
          {groupPlos.map((plo) => {
            const selected = selectedId === plo.id;
            return (
              <button
                key={plo.id}
                onClick={() => selectAnchor(groupId, plo.id)}
                style={{
                  position:     "relative",
                  textAlign:    "left",
                  background:   selected ? `${color}12` : "#fff",
                  border:       `${selected ? 2 : 1.5}px solid ${selected ? color : "var(--line)"}`,
                  borderRadius: 12,
                  padding:      "13px 40px 13px 14px",
                  cursor:       "pointer",
                  transition:   "all 0.15s",
                  boxShadow:    selected ? `0 4px 16px ${color}22` : "var(--sh-xs)",
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = `${color}80`;
                    e.currentTarget.style.transform   = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.transform   = "";
                  }
                }}
              >
                <span style={{
                  position:   "absolute",
                  top:        11,
                  right:      12,
                  fontSize:   17,
                  color:      selected ? color : "var(--line)",
                  lineHeight: 1,
                  transition: "color 0.15s",
                }}>
                  {selected ? "★" : "☆"}
                </span>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.35,
                  marginBottom: plo.paraphrase ? 5 : 0,
                }}>
                  {plo.shortTitle}
                </div>
                {plo.paraphrase && (
                  <div style={{
                    fontSize: 11.5, color: "var(--text-3)",
                    fontFamily: "'Sora', sans-serif", lineHeight: 1.5,
                  }}>
                    {plo.paraphrase}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => anchorGroupIdx === 0 ? setPhase("paint") : setAnchorGroupIdx((i) => i - 1)}
            style={{
              fontSize: 13, padding: "9px 18px", borderRadius: 8,
              border: "1.5px solid var(--line)", background: "transparent",
              cursor: "pointer", color: "var(--text-2)", fontFamily: "'Sora', sans-serif",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            ←
          </button>

          <button
            onClick={nextAnchorGroup}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "10px 24px" }}
          >
            {isLast ? "Finish →" : `Next: Group ${groupLetter(usedGroups[anchorGroupIdx + 1])} →`}
          </button>
        </div>
      </div>
    );
  }

  // ── Paint phase ────────────────────────────────────────────────────────────

  const activeColor  = CLUSTER_COLORS[activeCluster - 1];
  const hoveredPlo   = plos.find((p) => p.id === hoveredId) ?? null;
  const hoveredGroup = hoveredId != null ? assignments[hoveredId] : undefined;
  const hoveredColor = hoveredGroup != null ? CLUSTER_COLORS[hoveredGroup - 1] : undefined;

  return (
    <div style={{ padding: "32px 0 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: "0.1em",
          color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 7,
        }}>
          STEP 1 OF 2
        </div>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 5 }}>
          Sort concepts into groups
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>
          Think about which skills naturally belong together. No right answers.
        </p>
      </div>

      {/* ── Palette toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        paddingBottom: 14, marginBottom: 16, borderBottom: "1px solid var(--line)",
      }}>
        {Array.from({ length: clusterCount }, (_, i) => i + 1).map((c) => {
          const color    = CLUSTER_COLORS[c - 1];
          const isActive = activeCluster === c;
          const count    = Object.values(assignments).filter((v) => v === c).length;
          return (
            <button
              key={c}
              onClick={() => setActiveCluster(c)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: isActive ? "7px 14px" : "6px 10px",
                borderRadius: 20,
                border: `2px solid ${isActive ? color : "transparent"}`,
                background: isActive ? `${color}16` : `${color}0a`,
                cursor: "pointer", transition: "all 0.13s", outline: "none",
              }}
            >
              <div style={{
                width: isActive ? 14 : 10, height: isActive ? 14 : 10,
                borderRadius: "50%", background: color, flexShrink: 0,
                boxShadow: isActive ? `0 0 0 3px ${color}28` : "none",
                transition: "all 0.13s",
              }} />
              {count > 0 && (
                <span style={{ fontSize: 10, fontFamily: "'Fira Code', monospace", color: isActive ? color : `${color}90` }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {clusterCount < MAX_CLUSTERS && (
          <button
            onClick={addGroup}
            style={{
              padding: "6px 11px", borderRadius: 20,
              border: "1.5px dashed var(--line)", background: "transparent",
              cursor: "pointer", fontSize: 12, color: "var(--text-3)",
              fontFamily: "'Sora', sans-serif", transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.style.color = "var(--ink)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--text-3)"; }}
          >
            + add group
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {allPainted && usedGroups.length >= 2 && (
            <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600, fontFamily: "'Sora', sans-serif" }}>
              All sorted ✓
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>
            {assignedCount} / {plos.length}
          </span>
        </div>
      </div>

      {/* ── Hint ── */}
      <div style={{
        fontSize: 11.5, color: "var(--text-3)", fontFamily: "'Sora', sans-serif",
        marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: activeColor,
          boxShadow: `0 0 0 2px ${activeColor}30`, flexShrink: 0,
        }} />
        Painting with this colour — click any concept to assign it
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* Left: compact card grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
            gap: 6,
            marginBottom: 32,
          }}>
            {plos.map((plo) => {
              const c       = assignments[plo.id];
              const color   = c != null ? CLUSTER_COLORS[c - 1] : undefined;
              const painted = c != null;
              const isHovered = hoveredId === plo.id;

              return (
                <button
                  key={plo.id}
                  onClick={() => paintCard(plo.id)}
                  onMouseEnter={() => setHoveredId(plo.id)}
                  style={{
                    textAlign:    "left",
                    background:   painted ? `${color}0e` : "#fff",
                    border:       `1.5px solid ${painted ? `${color}55` : isHovered ? `${activeColor}70` : "var(--line)"}`,
                    borderLeft:   painted ? `3.5px solid ${color}` : `1.5px solid ${isHovered ? activeColor : "var(--line)"}`,
                    borderRadius: 8,
                    padding:      "9px 10px",
                    cursor:       "pointer",
                    transition:   "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                    boxShadow:    isHovered
                      ? painted ? `0 3px 12px ${color}28` : `0 3px 12px ${activeColor}1a`
                      : "none",
                    outline:      "none",
                  }}
                >
                  {painted && (
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: color, marginBottom: 5,
                    }} />
                  )}
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: "var(--ink)", fontFamily: "'Sora', sans-serif", lineHeight: 1.3,
                  }}>
                    {plo.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "'Sora', sans-serif" }}>
              {!allPainted
                ? `${plos.length - assignedCount} left to sort`
                : usedGroups.length < 2
                ? "Use at least 2 groups to continue"
                : ""}
            </div>
            <button
              onClick={() => { setAnchorGroupIdx(0); setPhase("anchor"); }}
              disabled={!canAdvance}
              className="btn btn-primary"
              style={{
                fontSize: 13, padding: "10px 24px",
                opacity: canAdvance ? 1 : 0.35,
                cursor:  canAdvance ? "pointer" : "not-allowed",
              }}
            >
              Pick anchors →
            </button>
          </div>
        </div>

        {/* Right: sticky detail panel */}
        <div style={{
          width:       230,
          flexShrink:  0,
          position:    "sticky",
          top:         80,
          alignSelf:   "flex-start",
        }}>
          <div style={{
            background:   hoveredColor ? `${hoveredColor}08` : "var(--bg)",
            border:       `1px solid ${hoveredColor ? `${hoveredColor}30` : "var(--line)"}`,
            borderRadius: 14,
            padding:      "18px 16px",
            transition:   "background 0.2s, border-color 0.2s",
            minHeight:    160,
          }}>
            {hoveredPlo ? (
              <>
                {hoveredColor && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: hoveredColor, marginBottom: 10 }} />
                )}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "var(--ink)",
                  fontFamily: "'Sora', sans-serif", lineHeight: 1.35, marginBottom: 10,
                }}>
                  {hoveredPlo.shortTitle}
                </div>
                <div style={{
                  fontSize: 12, color: "var(--text-2)",
                  fontFamily: "'Sora', sans-serif", lineHeight: 1.65,
                }}>
                  {hoveredPlo.paraphrase}
                </div>
              </>
            ) : (
              <div style={{
                fontSize: 12, color: "var(--text-3)",
                fontFamily: "'Sora', sans-serif", lineHeight: 1.6,
                paddingTop: 8,
              }}>
                Hover any concept to read its description here.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
