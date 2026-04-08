import { RespondentData, DerivedMetrics, RespondentStep, Edge, PLO } from "./types";

// ─── Graph helpers ────────────────────────────────────────────────────────────

function buildAdj(nodeIds: string[], edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  }
  return adj;
}

/** BFS shortest path — returns ordered node array or null */
function bfsPath(adj: Map<string, string[]>, src: string, tgt: string): string[] | null {
  if (src === tgt) return [src];
  const queue: string[][] = [[src]];
  const visited = new Set<string>([src]);
  while (queue.length) {
    const path = queue.shift()!;
    for (const nb of adj.get(path[path.length - 1]) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        const next = [...path, nb];
        if (nb === tgt) return next;
        queue.push(next);
      }
    }
  }
  return null;
}

/** Node degree (number of edges touching it) */
function degree(id: string, edges: Edge[]): number {
  return edges.filter((e) => e.source === id || e.target === id).length;
}

// ─── Scenario selectors (used by task components) ────────────────────────────

/** Pick a source-target pair with BFS distance 2–4 for pathfinding task */
export function selectPathfindingPair(
  plos: PLO[],
  edges: Edge[]
): { sourceId: string; targetId: string; optimalLength: number } | null {
  if (plos.length < 3 || edges.length < 2) return null;

  const ids = plos.map((p) => p.id);
  const adj = buildAdj(ids, edges);
  const directSet = new Set(edges.flatMap((e) => [`${e.source}:${e.target}`, `${e.target}:${e.source}`]));

  let best: { sourceId: string; targetId: string; optimalLength: number } | null = null;

  // Sample up to 60 pairs to avoid quadratic blow-up on dense graphs
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  outer: for (let i = 0; i < Math.min(shuffled.length, 10); i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const a = shuffled[i], b = shuffled[j];
      if (directSet.has(`${a}:${b}`)) continue;
      const path = bfsPath(adj, a, b);
      if (!path || path.length < 3 || path.length > 5) continue;
      const dist = path.length - 1;
      if (!best || dist > best.optimalLength) {
        best = { sourceId: a, targetId: b, optimalLength: dist };
        if (dist >= 3) break outer; // good enough
      }
    }
  }
  return best;
}

/** Pick the highest-degree node as the "disrupted" concept for perturbation task */
export function selectPerturbationScenario(
  plos: PLO[],
  edges: Edge[]
): { removedId: string; neighborIds: string[] } | null {
  if (edges.length < 2) return null;
  let maxDeg = 0, bridgeId: string | null = null;
  for (const p of plos) {
    const d = degree(p.id, edges);
    if (d > maxDeg) { maxDeg = d; bridgeId = p.id; }
  }
  if (!bridgeId || maxDeg < 2) return null;
  const neighborIds = edges
    .filter((e) => e.source === bridgeId || e.target === bridgeId)
    .map((e) => (e.source === bridgeId ? e.target : e.source));
  return { removedId: bridgeId, neighborIds };
}

/** Pick up to n distinct source-target pairs for multiple pathfinding tasks */
export function selectMultiplePathfindingPairs(
  n: number,
  plos: PLO[],
  edges: Edge[],
): Array<{ sourceId: string; targetId: string; optimalLength: number }> {
  if (plos.length < 3 || edges.length < 2) return [];

  const ids = plos.map((p) => p.id);
  const adj = buildAdj(ids, edges);
  const directSet = new Set(edges.flatMap((e) => [`${e.source}:${e.target}`, `${e.target}:${e.source}`]));

  const results: Array<{ sourceId: string; targetId: string; optimalLength: number }> = [];
  const usedPairs = new Set<string>();

  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length && results.length < n; i++) {
    for (let j = i + 1; j < shuffled.length && results.length < n; j++) {
      const a = shuffled[i], b = shuffled[j];
      const key = [a, b].sort().join(":");
      if (usedPairs.has(key)) continue;
      if (directSet.has(`${a}:${b}`)) continue;
      const path = bfsPath(adj, a, b);
      if (!path || path.length < 3 || path.length > 5) continue;
      usedPairs.add(key);
      results.push({ sourceId: a, targetId: b, optimalLength: path.length - 1 });
    }
  }
  return results;
}

/** Pick up to n distinct nodes (highest-degree first) for multiple perturbation tasks */
export function selectMultiplePerturbationScenarios(
  n: number,
  plos: PLO[],
  edges: Edge[],
): Array<{ removedId: string; neighborIds: string[] }> {
  if (edges.length < 2) return [];

  // Sort by degree descending, require at least 2 connections
  const ranked = plos
    .map((p) => ({ id: p.id, deg: degree(p.id, edges) }))
    .filter((x) => x.deg >= 2)
    .sort((a, b) => b.deg - a.deg)
    .slice(0, n);

  return ranked.map(({ id }) => ({
    removedId: id,
    neighborIds: edges
      .filter((e) => e.source === id || e.target === id)
      .map((e) => (e.source === id ? e.target : e.source)),
  }));
}

/** Compute bridge-replacement accuracy for perturbation task */
export function computeBridgeAccuracy(
  chosenId: string,
  neighborIds: string[],
  edges: Edge[]
): number {
  if (neighborIds.length === 0) return 0;
  const chosenNeighbors = new Set(
    edges
      .filter((e) => e.source === chosenId || e.target === chosenId)
      .map((e) => (e.source === chosenId ? e.target : e.source))
  );
  const shared = neighborIds.filter((n) => n !== chosenId && chosenNeighbors.has(n));
  return Math.round((shared.length / neighborIds.length) * 100) / 100;
}

/** Validate a path chosen during pathfinding task */
export function validatePath(path: string[], edges: Edge[]): boolean {
  const directSet = new Set(edges.flatMap((e) => [`${e.source}:${e.target}`, `${e.target}:${e.source}`]));
  for (let i = 0; i < path.length - 1; i++) {
    if (!directSet.has(`${path[i]}:${path[i + 1]}`)) return false;
  }
  return true;
}

// ─── Main metrics computation ─────────────────────────────────────────────────

export function computeMetrics(data: RespondentData): DerivedMetrics {
  const { nodes, edges, gpa, timestamps, startedAt, completedAt, pathfinding, perturbation } = data;

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  const weightSum = edges.reduce((s, e) => s + e.weight, 0);
  const avgEdgeWeight = edgeCount > 0 ? weightSum / edgeCount : 0;

  const variance =
    edgeCount > 1
      ? edges.reduce((s, e) => s + (e.weight - avgEdgeWeight) ** 2, 0) / edgeCount
      : 0;
  const edgeWeightSD = Math.sqrt(variance);

  const zombieSkillCount = nodes.filter((node) => {
    const nodeEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
    return nodeEdges.length === 0 || nodeEdges.every((e) => e.weight === 1);
  }).length;

  const timePerStep: Partial<Record<RespondentStep, number>> = {};
  timestamps.forEach((ts) => {
    if (ts.exitedAt) {
      const ms = new Date(ts.exitedAt).getTime() - new Date(ts.enteredAt).getTime();
      timePerStep[ts.step] = Math.round((ms / 60_000) * 10) / 10;
    }
  });

  const totalMs =
    completedAt && startedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : 0;
  const totalMinutes = Math.round((totalMs / 60_000) * 10) / 10;

  const clusterCount = new Set(
    nodes.map((n) => n.cluster).filter((c): c is number => c != null)
  ).size;
  const centralConceptCount = nodes.filter((n) => n.isCentral).length;

  return {
    nodeCount,
    edgeCount,
    avgEdgeWeight:       Math.round(avgEdgeWeight * 100) / 100,
    edgeWeightSD:        Math.round(edgeWeightSD  * 100) / 100,
    zombieSkillCount,
    clusterCount,
    centralConceptCount,
    pathfindingAccuracy: pathfinding?.accuracy,
    pathfindingTimeMs:   pathfinding?.timeMs,
    bridgeAccuracy:      perturbation?.bridgeAccuracy,
    perturbationTimeMs:  perturbation?.timeMs,
    gpa,
    totalMinutes,
    timePerStep,
  };
}
