"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/useHydration";
import { RESPONDENT_STEPS } from "@/lib/types";
import { StepProgress } from "@/components/StepProgress";
import { StepIntro } from "@/components/respondent/StepIntro";
import { StepClustering } from "@/components/respondent/StepClustering";
import { StepEdgeCreation } from "@/components/respondent/StepEdgeCreation";
import { StepPathfinding } from "@/components/respondent/StepPathfinding";
import { StepPerturbation } from "@/components/respondent/StepPerturbation";
import { StepMetadata } from "@/components/respondent/StepMetadata";
import { StepComplete } from "@/components/respondent/StepComplete";

const CANVAS_STEPS = new Set(["edge_creation"]);

// Steps where the respondent has already started entering data — warn before leaving
const WARN_ON_LEAVE_STEPS = new Set([
  "clustering", "edge_creation", "metadata", "pathfinding", "perturbation",
]);

export default function RespondentPage() {
  const { session, respondentStep, recordStepEntry, loadServerSession } = useAppStore();
  const router   = useRouter();
  const hydrated = useHasHydrated();
  const isCanvas = CANVAS_STEPS.has(respondentStep);

  // The server is the authority on whether the study is launched.
  // We ALWAYS fetch from the server — never trust localStorage isLaunched as the gate.
  // This ensures respondents on any device see the correct state.
  const [serverLaunched, setServerLaunched] = useState(false);
  const [serverChecked,  setServerChecked]  = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.launched && Array.isArray(data.plos) && data.plos.length > 0) {
          loadServerSession(data.sessionId ?? "server", data.plos);
          setServerLaunched(true);
        }
      })
      .catch(() => {
        // Network error — nothing to do, serverLaunched stays false
      })
      .finally(() => setServerChecked(true));
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Record entry into each step
  useEffect(() => {
    if (!serverLaunched) return; // don't record steps before session is confirmed
    recordStepEntry(respondentStep);
  }, [respondentStep, serverLaunched]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before accidentally leaving in the middle of a session
  useEffect(() => {
    if (!WARN_ON_LEAVE_STEPS.has(respondentStep)) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [respondentStep]);

  // ── Loading: wait for hydration + server check ───────────────────────────────
  if (!hydrated || !serverChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-3)" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="25 12" strokeLinecap="round"/>
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ fontSize: 14 }}>Loading study…</span>
        </div>
      </div>
    );
  }

  // ── Session not yet launched by researcher ───────────────────────────────────
  if (!serverLaunched) {
    return (
      <ErrorState
        icon={
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="10" stroke="var(--ink)" strokeWidth="1.5"/>
            <path d="M13 8v7" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="13" cy="18.5" r="1.2" fill="var(--ink)"/>
          </svg>
        }
        title="Study not yet launched"
        body="The researcher hasn't launched this session yet. Please check back when you receive the confirmed link."
        actionLabel="Retry"
        onAction={() => {
          setServerChecked(false);
          fetch("/api/session", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
              if (data.launched && Array.isArray(data.plos) && data.plos.length > 0) {
                loadServerSession(data.sessionId ?? "server", data.plos);
                setServerLaunched(true);
              }
            })
            .catch(() => {})
            .finally(() => setServerChecked(true));
        }}
      />
    );
  }

  // ── Study already completed ──────────────────────────────────────────────────
  if (session?.respondentData?.completedAt && respondentStep !== "complete") {
    return (
      <ErrorState
        icon={
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="10" stroke="#10b981" strokeWidth="1.5"/>
            <path d="M8 13l3.5 3.5 6.5-6.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="Session already completed"
        body="This study session has already been submitted. Each device can only complete one session."
        actionLabel="View your completion screen"
        onAction={() => useAppStore.getState().setRespondentStep("complete")}
        secondaryLabel="Researcher results"
        onSecondary={() => router.push("/results")}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: isCanvas ? "100vh" : undefined,
        minHeight: isCanvas ? undefined : "100vh",
        overflow: isCanvas ? "hidden" : undefined,
        background: isCanvas ? "var(--cv-bg)" : "var(--bg)",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: `1px solid ${isCanvas ? "rgba(255,255,255,0.05)" : "var(--line)"}`,
          background: isCanvas ? "rgba(10,22,36,0.97)" : "rgba(245,242,236,0.97)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            maxWidth: isCanvas ? undefined : 920,
            margin: isCanvas ? undefined : "0 auto",
            padding: isCanvas ? "10px 20px" : "10px 24px",
          }}
        >
          {/* Top row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: respondentStep !== "intro" && respondentStep !== "complete" ? 10 : 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: isCanvas ? "rgba(255,255,255,0.08)" : "var(--ink)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="2.5" cy="2.5" r="1.8" fill={isCanvas ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.9)"}/>
                  <circle cx="8.5" cy="2.5" r="1.8" fill={isCanvas ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.45)"}/>
                  <circle cx="8.5" cy="8.5" r="1.8" fill="#C84B1C" opacity="0.9"/>
                  <line x1="2.5" y1="2.5" x2="8.5" y2="8.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
                </svg>
              </div>
              <span
                className="font-display"
                style={{ fontSize: 13, fontWeight: 600, color: isCanvas ? "rgba(255,255,255,0.35)" : "var(--ink)", letterSpacing: "-0.01em" }}
              >
                Cognitive Navigation Study
              </span>
            </div>

            {respondentStep !== "complete" && (
              <span className="font-mono-custom" style={{ fontSize: 10, color: isCanvas ? "rgba(255,255,255,0.16)" : "var(--text-3)" }}>
                No right or wrong answers
              </span>
            )}
          </div>

          {/* Progress bar */}
          {respondentStep !== "intro" && respondentStep !== "complete" && (
            <StepProgress currentStep={respondentStep} dark={isCanvas} />
          )}
        </div>
      </header>

      {/* ── Content ── */}
      {isCanvas ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          {respondentStep === "edge_creation" && <StepEdgeCreation />}
        </div>
      ) : (
        <main style={{ flex: 1, padding: respondentStep === "complete" ? "0" : "56px 16px" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            {respondentStep === "intro"        && <StepIntro        />}
            {respondentStep === "clustering"   && <StepClustering   />}
            {respondentStep === "pathfinding"  && <StepPathfinding  />}
            {respondentStep === "perturbation" && <StepPerturbation />}
            {respondentStep === "metadata"     && <StepMetadata     />}
            {respondentStep === "complete"     && <StepComplete     />}
          </div>
        </main>
      )}
    </div>
  );
}

// ── Shared error/gate state component ────────────────────────────────────────

function ErrorState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 20, padding: "52px 48px", maxWidth: 380, textAlign: "center", boxShadow: "var(--sh-md)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--ink-pale)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          {icon}
        </div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 28, lineHeight: 1.65 }}>
          {body}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onAction} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button onClick={onSecondary} style={{ width: "100%", fontSize: 13, padding: "10px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", color: "var(--text-2)", cursor: "pointer" }}>
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
