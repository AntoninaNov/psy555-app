"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  StudySession,
  SyllabusFile,
  PLO,
  CanvasNode,
  Edge,
  RespondentData,
  ResearcherStep,
  RespondentStep,
  StepTimestamp,
  PathfindingResult,
  PerturbationResult,
} from "./types";
import { nanoid } from "./nanoid";

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // ── Session
  session: StudySession | null;

  // ── Accumulated respondent submissions (one entry per completed respondent)
  completedSessions: RespondentData[];

  // ── Researcher UI
  researcherStep: ResearcherStep;
  isExtracting: boolean;
  isLaunched: boolean;       // true once researcher clicks "Launch study"

  // ── Respondent UI
  respondentStep: RespondentStep;

  // ── Session actions
  initSession: () => void;
  addSyllabusFile: (file: SyllabusFile) => void;
  removeSyllabusFile: (id: string) => void;
  setNormalizedPLOs: (plos: PLO[]) => void;
  updatePLO: (id: string, updates: Partial<PLO>) => void;
  removePLO: (id: string) => void;
  addPLO: (plo: Omit<PLO, "id">) => void;

  // ── Researcher UI actions
  setResearcherStep: (step: ResearcherStep) => void;
  setIsExtracting: (val: boolean) => void;
  setLaunched: () => void;

  // ── Respondent actions
  initRespondent: () => void;
  setRespondentStep: (step: RespondentStep) => void;
  recordStepEntry: (step: RespondentStep) => void;
  recordStepExit: (step: RespondentStep) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setPathfindingResult: (result: PathfindingResult) => void;
  setPerturbationResult: (result: PerturbationResult) => void;
  setGpa: (gpa: number) => void;
  completeRespondent: () => void;

  // ── Completed sessions CRUD
  deleteCompletedSession: (respondentId: string) => void;

  // ── Server session hydration (respondent on fresh device)
  loadServerSession: (sessionId: string, plos: PLO[]) => void;

  // ── Reset
  resetAll: () => void;
  resetRespondent: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function updateRd(
  s: AppState,
  fn: (rd: RespondentData) => Partial<RespondentData>
): Partial<AppState> {
  if (!s.session?.respondentData) return {};
  return {
    session: {
      ...s.session,
      respondentData: { ...s.session.respondentData, ...fn(s.session.respondentData) },
    },
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      session: null,
      completedSessions: [],
      researcherStep: "upload",
      isExtracting: false,
      isLaunched: false,
      respondentStep: "intro",

      // ── Session ─────────────────────────────────────────────────────────────
      initSession: () =>
        set({
          session: {
            id: nanoid(),
            createdAt: new Date().toISOString(),
            syllabusFiles: [],
            normalizedPLOs: [],
          },
          researcherStep: "upload",
          respondentStep: "intro",
          isLaunched: false,
        }),

      addSyllabusFile: (file) =>
        set((s) => ({
          session: s.session
            ? { ...s.session, syllabusFiles: [...s.session.syllabusFiles, file] }
            : s.session,
        })),

      removeSyllabusFile: (id) =>
        set((s) => ({
          session: s.session
            ? { ...s.session, syllabusFiles: s.session.syllabusFiles.filter((f) => f.id !== id) }
            : s.session,
        })),

      setNormalizedPLOs: (plos) =>
        set((s) => ({
          session: s.session ? { ...s.session, normalizedPLOs: plos } : s.session,
        })),

      updatePLO: (id, updates) =>
        set((s) => ({
          session: s.session
            ? {
                ...s.session,
                normalizedPLOs: s.session.normalizedPLOs.map((p) =>
                  p.id === id ? { ...p, ...updates } : p
                ),
              }
            : s.session,
        })),

      removePLO: (id) =>
        set((s) => ({
          session: s.session
            ? {
                ...s.session,
                normalizedPLOs: s.session.normalizedPLOs.filter((p) => p.id !== id),
              }
            : s.session,
        })),

      addPLO: (plo) =>
        set((s) => ({
          session: s.session
            ? {
                ...s.session,
                normalizedPLOs: [...s.session.normalizedPLOs, { ...plo, id: nanoid() }],
              }
            : s.session,
        })),

      // ── Researcher UI ────────────────────────────────────────────────────────
      setResearcherStep: (step) => set({ researcherStep: step }),
      setIsExtracting:   (val)  => set({ isExtracting: val }),
      setLaunched: () => set({ isLaunched: true }),

      // ── Respondent ───────────────────────────────────────────────────────────
      initRespondent: () => {
        if (!get().session) return;
        set((s) => ({
          respondentStep: "intro",
          session: s.session
            ? {
                ...s.session,
                respondentData: {
                  id: nanoid(),
                  startedAt: new Date().toISOString(),
                  nodes: [],
                  edges: [],
                  timestamps: [],
                },
              }
            : s.session,
        }));
      },

      setRespondentStep: (step) => set({ respondentStep: step }),

      recordStepEntry: (step) => {
        const now = new Date().toISOString();
        set((s) =>
          updateRd(s, (rd) => {
            const timestamps: StepTimestamp[] = rd.timestamps.map((t) =>
              !t.exitedAt ? { ...t, exitedAt: now } : t
            );
            timestamps.push({ step, enteredAt: now });
            return { timestamps };
          })
        );
      },

      recordStepExit: (step) => {
        const now = new Date().toISOString();
        set((s) =>
          updateRd(s, (rd) => ({
            timestamps: rd.timestamps.map((t) =>
              t.step === step && !t.exitedAt ? { ...t, exitedAt: now } : t
            ),
          }))
        );
      },

      setNodes: (nodes) => set((s) => updateRd(s, () => ({ nodes }))),
      setEdges: (edges) => set((s) => updateRd(s, () => ({ edges }))),
      setPathfindingResult:  (pathfinding)  => set((s) => updateRd(s, () => ({ pathfinding }))),
      setPerturbationResult: (perturbation) => set((s) => updateRd(s, () => ({ perturbation }))),
      setGpa:   (gpa)   => set((s) => updateRd(s, () => ({ gpa }))),

      completeRespondent: () =>
        set((s) => {
          if (!s.session?.respondentData) return {};
          const now = new Date().toISOString();
          const finished: RespondentData = { ...s.session.respondentData, completedAt: now };
          // Append to completedSessions (deduplicate by id)
          const existing = s.completedSessions.filter((r) => r.id !== finished.id);
          return {
            completedSessions: [...existing, finished],
            session: { ...s.session, respondentData: finished },
          };
        }),

      deleteCompletedSession: (respondentId) =>
        set((s) => ({
          completedSessions: s.completedSessions.filter((r) => r.id !== respondentId),
        })),

      loadServerSession: (sessionId, plos) =>
        set((s) => ({
          isLaunched: true,
          session: {
            id: sessionId,
            createdAt: s.session?.createdAt ?? new Date().toISOString(),
            syllabusFiles: s.session?.syllabusFiles ?? [],
            normalizedPLOs: plos,
            respondentData: s.session?.respondentData,
          },
        })),

      // ── Reset ────────────────────────────────────────────────────────────────
      resetAll: () =>
        set({ session: null, completedSessions: [], researcherStep: "upload", respondentStep: "intro", isLaunched: false }),

      // resetRespondent clears the in-progress session but keeps completedSessions intact
      resetRespondent: () =>
        set((s) => ({
          respondentStep: "intro",
          session: s.session ? { ...s.session, respondentData: undefined } : s.session,
        })),
    }),
    {
      name: "psy555-session",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
