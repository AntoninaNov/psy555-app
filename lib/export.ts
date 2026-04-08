import { StudySession } from "./types";
import { computeMetrics } from "./metrics";

export function exportJSON(session: StudySession): string {
  const derived = session.respondentData
    ? computeMetrics(session.respondentData)
    : undefined;
  return JSON.stringify({ session, derived }, null, 2);
}

export function downloadJSON(session: StudySession): void {
  const blob = new Blob([exportJSON(session)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `psy555-session-${session.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(session: StudySession): string {
  if (!session.respondentData) return "";
  const rd      = session.respondentData;
  const metrics = computeMetrics(rd);

  const rows: [string, string][] = [
    ["field", "value"],
    // ── Identifiers
    ["session_id",               session.id],
    ["respondent_id",            rd.id],
    ["started_at",               rd.startedAt],
    ["completed_at",             rd.completedAt ?? ""],
    ["total_minutes",            String(metrics.totalMinutes)],
    // ── Primary DVs — behavioural tasks (B-series hypotheses)
    ["nav_accuracy",             metrics.pathfindingAccuracy != null ? String(Math.round(metrics.pathfindingAccuracy * 100)) : ""],
    ["nav_time_s",               metrics.pathfindingTimeMs   != null ? String(Math.round(metrics.pathfindingTimeMs / 1000)) : ""],
    ["nav_chosen_hops",          rd.pathfinding ? String(rd.pathfinding.chosenPath.length - 1) : ""],
    ["nav_optimal_hops",         rd.pathfinding ? String(rd.pathfinding.optimalLength) : ""],
    ["bridge_accuracy",          metrics.bridgeAccuracy      != null ? String(Math.round(metrics.bridgeAccuracy * 100)) : ""],
    ["adapt_time_s",             metrics.perturbationTimeMs  != null ? String(Math.round(metrics.perturbationTimeMs / 1000)) : ""],
    // ── Composite DV
    ["cog_nav_index",            (() => {
      const n = metrics.pathfindingAccuracy;
      const b = metrics.bridgeAccuracy;
      if (n != null && b != null) return String(Math.round(((n + b) / 2) * 100));
      if (n != null) return String(Math.round(n * 100));
      if (b != null) return String(Math.round(b * 100));
      return "";
    })()],
    // ── Control variable
    ["gpa",                      rd.gpa != null ? String(rd.gpa) : ""],
    // ── Structural IVs — map metrics (H-series hypotheses)
    ["node_count",               String(metrics.nodeCount)],
    ["edge_count",               String(metrics.edgeCount)],
    ["cluster_count",            String(metrics.clusterCount)],
    ["central_concept_count",    String(metrics.centralConceptCount)],
    ["avg_edge_weight",          String(metrics.avgEdgeWeight)],
    ["edge_weight_sd",           String(metrics.edgeWeightSD)],
    ["zombie_skill_count",       String(metrics.zombieSkillCount)],
    // ── Task scenario identifiers (for reproducibility)
    ["nav_source_id",            rd.pathfinding?.sourceId ?? ""],
    ["nav_target_id",            rd.pathfinding?.targetId ?? ""],
    ["perturb_removed_id",       rd.perturbation?.removedId ?? ""],
    ["perturb_bridge_choice_id", rd.perturbation?.bridgeChoiceId ?? ""],
    // ── Time per step (minutes)
    ["time_clustering_min",      String(metrics.timePerStep.clustering ?? "")],
    ["time_edge_creation_min",   String(metrics.timePerStep.edge_creation ?? "")],
    ["time_metadata_min",        String(metrics.timePerStep.metadata ?? "")],
    ["time_pathfinding_min",     String(metrics.timePerStep.pathfinding ?? "")],
    ["time_perturbation_min",    String(metrics.timePerStep.perturbation ?? "")],
  ];

  return rows
    .map(([k, v]) =>
      `${k},${v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v}`
    )
    .join("\n");
}

export function downloadCSV(session: StudySession): void {
  const blob = new Blob([exportCSV(session)], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `psy555-session-${session.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
