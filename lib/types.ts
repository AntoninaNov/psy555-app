// ─── Cluster colours (index = clusterId - 1) ─────────────────────────────────

export const CLUSTER_COLORS = [
  "#3b82f6", // 1 — blue
  "#10b981", // 2 — emerald
  "#f59e0b", // 3 — amber
  "#8b5cf6", // 4 — violet
  "#ec4899", // 5 — pink
] as const;

// ─── Core entities ────────────────────────────────────────────────────────────

export interface SyllabusFile {
  id: string;
  name: string;
  type: "pdf" | "docx" | "txt" | "paste";
  rawText: string;
  uploadedAt: string;
}

export interface PLO {
  id: string;
  shortTitle: string;
  paraphrase: string;
  original?: string;
  sourceIds?: string[];
}

// ─── Respondent canvas data ───────────────────────────────────────────────────

export type ProximityZone = "mine" | "familiar" | "distant";

export interface CanvasNode {
  id: string; // references PLO.id
  x: number;
  y: number;
  proximity?: ProximityZone;
  cluster?: number;    // 1–5, assigned in clustering step
  isCentral?: boolean; // marked as hub of its cluster
}

export interface Edge {
  id: string;
  source: string; // PLO id
  target: string; // PLO id
  weight: 1 | 2 | 3;
}

export const WEIGHT_LABELS: Record<Edge["weight"], string> = {
  1: "Weak",
  2: "Moderate",
  3: "Strong",
};

// ─── Behavioural task results ─────────────────────────────────────────────────

export interface PathfindingResult {
  sourceId:      string;
  targetId:      string;
  chosenPath:    string[];  // [sourceId, ...intermediates, targetId]
  optimalLength: number;    // BFS shortest path edge-count
  accuracy:      number;    // optimalLength / max(chosenPath.length-1, 1), capped 0–1
  timeMs:        number;
}

export interface PerturbationResult {
  removedId:      string;   // highest-degree "bridge" concept
  bridgeChoiceId: string;   // respondent's chosen replacement
  bridgeAccuracy: number;   // 0–1: how many of removed node's neighbours does choice share
  timeMs:         number;
}

// ─── Step tracking ────────────────────────────────────────────────────────────

export type RespondentStep =
  | "intro"
  | "node_selection"
  | "clustering"
  | "edge_creation"
  | "pathfinding"
  | "perturbation"
  | "metadata"
  | "complete";

export type ResearcherStep = "upload" | "extract" | "review" | "launch";

export interface StepTimestamp {
  step: RespondentStep;
  enteredAt: string;
  exitedAt?: string;
}

export const RESPONDENT_STEPS: Array<{ key: RespondentStep; label: string }> = [
  { key: "intro",        label: "Intro"     },
  { key: "clustering",   label: "Map"       },
  { key: "metadata",     label: "About You" },
  { key: "pathfinding",  label: "Navigate"  },
  { key: "perturbation", label: "Adapt"     },
  { key: "complete",     label: "Done"      },
];

// ─── Respondent session data ──────────────────────────────────────────────────

export interface RespondentData {
  id: string;
  startedAt: string;
  completedAt?: string;
  nodes: CanvasNode[];
  edges: Edge[];
  pathfinding?:  PathfindingResult;
  perturbation?: PerturbationResult;
  gpa?: number;
  timestamps: StepTimestamp[];
}

// ─── Derived metrics (per respondent) ────────────────────────────────────────

export interface DerivedMetrics {
  // Map-building
  nodeCount:            number;
  edgeCount:            number;
  avgEdgeWeight:        number;
  edgeWeightSD:         number;
  zombieSkillCount:     number;
  clusterCount:         number;
  centralConceptCount:  number;
  // Behavioural tasks
  pathfindingAccuracy?: number;  // 0–1
  pathfindingTimeMs?:   number;
  bridgeAccuracy?:      number;  // 0–1
  perturbationTimeMs?:  number;
  // Background
  gpa?:         number;
  totalMinutes: number;
  timePerStep:  Partial<Record<RespondentStep, number>>;
}

// ─── Full study session ───────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  createdAt: string;
  syllabusFiles: SyllabusFile[];
  normalizedPLOs: PLO[];
  respondentData?: RespondentData;
}
