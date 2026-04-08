/**
 * Tests for the Zustand store actions related to session launching.
 *
 * Covers:
 *  - loadServerSession: sets isLaunched + populates PLOs, preserves respondentData
 *  - setLaunched: flips the flag
 *  - resetAll: wipes everything
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/lib/store";
import type { PLO } from "@/lib/types";

function makePlo(n: number): PLO {
  return { id: `plo-${n}`, shortTitle: `Skill ${n}`, paraphrase: `Desc ${n}` };
}

const PLOS = Array.from({ length: 14 }, (_, i) => makePlo(i + 1));

// Reset the store before each test
beforeEach(() => {
  useAppStore.getState().resetAll();
});

describe("loadServerSession", () => {
  it("sets isLaunched to true", () => {
    useAppStore.getState().loadServerSession("sess-1", PLOS);
    expect(useAppStore.getState().isLaunched).toBe(true);
  });

  it("populates normalizedPLOs with the server PLOs", () => {
    useAppStore.getState().loadServerSession("sess-1", PLOS);
    const plos = useAppStore.getState().session?.normalizedPLOs ?? [];
    expect(plos).toHaveLength(14);
    expect(plos[0].shortTitle).toBe("Skill 1");
  });

  it("creates a session with the given sessionId", () => {
    useAppStore.getState().loadServerSession("my-session-id", PLOS);
    expect(useAppStore.getState().session?.id).toBe("my-session-id");
  });

  it("preserves existing respondentData (completed respondent on same device)", () => {
    // Simulate a respondent who already completed the study on this device
    useAppStore.getState().initSession();
    useAppStore.getState().initRespondent();
    useAppStore.getState().setGpa(3.8);

    const rdBefore = useAppStore.getState().session?.respondentData;
    expect(rdBefore).toBeDefined();

    // Now simulate server session loaded (e.g., page refresh)
    useAppStore.getState().loadServerSession("sess-refreshed", PLOS);

    const rdAfter = useAppStore.getState().session?.respondentData;
    expect(rdAfter?.gpa).toBe(3.8); // preserved
  });

  it("can be called multiple times without resetting completedSessions", () => {
    // Simulate one completed session already in the store
    useAppStore.getState().initSession();
    useAppStore.getState().initRespondent();
    useAppStore.getState().completeRespondent();
    expect(useAppStore.getState().completedSessions).toHaveLength(1);

    // Load from server (page refresh scenario)
    useAppStore.getState().loadServerSession("sess-2", PLOS);
    // completedSessions must survive
    expect(useAppStore.getState().completedSessions).toHaveLength(1);
  });
});

describe("setLaunched", () => {
  it("sets isLaunched to true", () => {
    expect(useAppStore.getState().isLaunched).toBe(false);
    useAppStore.getState().setLaunched();
    expect(useAppStore.getState().isLaunched).toBe(true);
  });
});

describe("resetAll", () => {
  it("clears isLaunched and completedSessions", () => {
    useAppStore.getState().setLaunched();
    expect(useAppStore.getState().isLaunched).toBe(true);

    useAppStore.getState().resetAll();
    expect(useAppStore.getState().isLaunched).toBe(false);
    expect(useAppStore.getState().completedSessions).toHaveLength(0);
    expect(useAppStore.getState().session).toBeNull();
  });
});
