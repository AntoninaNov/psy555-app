"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/useHydration";
import { UploadPanel } from "@/components/researcher/UploadPanel";
import { PLOEditor } from "@/components/researcher/PLOEditor";
import { ResearcherStep } from "@/lib/types";
import { SAMPLE_PLOS, SAMPLE_SYLLABUS_FILE } from "@/lib/mockData";

const STEPS: Array<{
  key: ResearcherStep;
  label: string;
  description: string;
}> = [
  { key: "upload",  label: "Upload",      description: "Add syllabus files" },
  { key: "extract", label: "Preview",     description: "Review extracted skills" },
  { key: "review",  label: "Edit Skills", description: "Finalize 12–25 skills" },
  { key: "launch",  label: "Launch",      description: "Share respondent link" },
];

// ── PIN gate ─────────────────────────────────────────────────────────────────

// ── Change this PIN to anything you like, then redeploy ──────────────────────
const RESEARCHER_PIN = "psy555";
const SESSION_KEY    = "psy555-researcher-verified";

function PinGate({ onVerified }: { onVerified: () => void }) {
  const [value, setValue]   = useState("");
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === RESEARCHER_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onVerified();
    } else {
      setError(true);
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: "52px 48px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--sh-md)",
          animation: shake ? "shake 0.4s ease" : "none",
        }}
      >
        <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="5" y="9" width="10" height="8" rx="2" stroke="#fff" strokeWidth="1.5"/>
            <path d="M7 9V7a3 3 0 016 0v2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="10" cy="13" r="1" fill="#fff"/>
          </svg>
        </div>
        <h1 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
          Researcher access
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
          Enter the researcher PIN to access the study configuration panel.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder="PIN"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: `1.5px solid ${error ? "#ef4444" : "var(--line)"}`,
              fontSize: 16,
              textAlign: "center",
              letterSpacing: "0.2em",
              color: "var(--ink)",
              background: error ? "#fef2f2" : "#fff",
              outline: "none",
              fontFamily: "'Fira Code', monospace",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", fontFamily: "'Sora', sans-serif" }}>
              Incorrect PIN — try again
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResearcherPage() {
  const { session, researcherStep, setResearcherStep, initSession, addSyllabusFile, setNormalizedPLOs } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const hydrated = useHasHydrated();

  useEffect(() => {
    // Check if already verified this browser session
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setPinVerified(true);
    }
  }, []);

  useEffect(() => {
    if (!pinVerified) return;
    // Reinitialize whenever stored PLOs don't exactly match the canonical psy-skills set.
    // This catches stale localStorage from any previous skill list.
    const canonicalIds = SAMPLE_PLOS.map((p) => p.id).sort().join(",");
    const storedIds    = (session?.normalizedPLOs ?? []).map((p) => p.id).sort().join(",");
    if (!session || canonicalIds !== storedIds) {
      initSession();
      addSyllabusFile(SAMPLE_SYLLABUS_FILE);
      setNormalizedPLOs(SAMPLE_PLOS);
      setResearcherStep("review");
    }
  }, [pinVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent hydration flash — show nothing until localStorage is read
  if (!hydrated) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  }

  // PIN gate — only bypass if no PIN is configured (dev mode)
  if (RESEARCHER_PIN && !pinVerified) {
    return <PinGate onVerified={() => setPinVerified(true)} />;
  }

  const currentIdx = STEPS.findIndex((s) => s.key === researcherStep);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: "rgba(245,242,236,0.97)",
          borderColor: "var(--line)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--ink)" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="4"  cy="4"  r="2.5" fill="rgba(255,255,255,0.9)"/>
                <circle cx="12" cy="4"  r="2.5" fill="rgba(255,255,255,0.45)"/>
                <circle cx="4"  cy="12" r="2.5" fill="rgba(255,255,255,0.45)"/>
                <circle cx="12" cy="12" r="2.5" fill="#C84B1C" opacity="0.9"/>
                <line x1="4" y1="4" x2="12" y2="12" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
                <line x1="12" y1="4" x2="4"  y2="12" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
                <line x1="4"  y1="4" x2="12" y2="4"  stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
                <line x1="4"  y1="4" x2="4"  y2="12" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
              </svg>
            </div>
            <div>
              <div className="font-display font-semibold text-sm leading-none" style={{ color: "var(--ink)" }}>
                Cognitive Navigation Study
              </div>
              <div className="text-[10px] font-mono-custom mt-0.5" style={{ color: "var(--text-3)" }}>
                Researcher setup
              </div>
            </div>
          </div>
          {session && (
            <div
              className="text-[10px] font-mono-custom px-2.5 py-1 rounded-md"
              style={{ background: "var(--ink-pale)", color: "var(--ink-soft)" }}
            >
              {session.id.slice(0, 8)}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Horizontal step wizard ── */}
        <div className="relative mb-10">
          {/* Connector track */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: 20,
              height: 2,
              background: "var(--line)",
              left: "calc(12.5%)",
              right: "calc(12.5%)",
            }}
          />
          {/* Completed fill */}
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              top: 20,
              height: 2,
              background: "var(--rust)",
              left: "calc(12.5%)",
              width: currentIdx > 0
                ? `${(currentIdx / (STEPS.length - 1)) * 75}%`
                : "0%",
            }}
          />

          <div className="flex items-start justify-between">
            {STEPS.map((step, i) => {
              const isDone     = i < currentIdx;
              const isCurrent  = step.key === researcherStep;
              const isReachable = i <= currentIdx;

              return (
                <button
                  key={step.key}
                  onClick={() => isReachable && setResearcherStep(step.key)}
                  disabled={!isReachable}
                  className="relative flex flex-col items-center gap-2 flex-1 disabled:cursor-default group"
                  style={{ zIndex: 2 }}
                >
                  {/* Circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0"
                    style={{
                      background: isDone
                        ? "var(--rust)"
                        : isCurrent
                        ? "var(--ink)"
                        : "#fff",
                      border: isDone || isCurrent
                        ? "none"
                        : `2px solid ${isReachable ? "var(--line-strong)" : "var(--line)"}`,
                      boxShadow: isCurrent
                        ? "0 0 0 5px var(--ink-pale), 0 2px 8px rgba(13,31,54,0.18)"
                        : isDone
                        ? "0 0 0 3px rgba(200,75,28,0.12)"
                        : "none",
                    }}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <span
                        className="font-mono-custom text-xs font-bold"
                        style={{ color: isCurrent ? "#fff" : "var(--text-3)" }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <div
                      className="text-xs font-semibold transition-colors"
                      style={{
                        color: isCurrent ? "var(--ink)"
                          : isDone ? "var(--rust)"
                          : "var(--text-3)",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 hidden sm:block"
                      style={{ color: "var(--text-3)" }}
                    >
                      {step.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content card ── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "#fff",
            borderColor: "var(--line)",
            boxShadow: "var(--sh-md)",
          }}
        >
          {/* Card header */}
          <div
            className="px-8 py-6 border-b"
            style={{
              borderColor: "var(--line-soft)",
              background: "var(--surface-alt)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="font-display text-2xl font-semibold"
                  style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
                >
                  {STEPS[currentIdx]?.label}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
                  {STEPS[currentIdx]?.description}
                </p>
              </div>
              {session && (
                <div className="flex-shrink-0 flex items-center gap-3 text-xs pt-1" style={{ color: "var(--text-3)" }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: session.syllabusFiles.length > 0 ? "var(--rust)" : "var(--line)" }} />
                    <span>{session.syllabusFiles.length} file{session.syllabusFiles.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: session.normalizedPLOs.length >= 12 ? "#2d6a4f" : session.normalizedPLOs.length > 0 ? "var(--rust)" : "var(--line)" }}
                    />
                    <span>{session.normalizedPLOs.length} skill{session.normalizedPLOs.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card body */}
          <div className="p-8">
            {researcherStep === "upload"  && <UploadPanel />}
            {researcherStep === "extract" && <ExtractPreview />}
            {researcherStep === "review"  && <PLOEditor />}
            {researcherStep === "launch"  && <LaunchView copied={copied} setCopied={setCopied} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Extract preview ──────────────────────────────────────────────────────────

function ExtractPreview() {
  const { session, setResearcherStep } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];

  if (plos.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "var(--ink-pale)" }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 2"/>
            <path d="M11 7v5M11 14v.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="font-display text-base font-semibold" style={{ color: "var(--ink)" }}>No skills yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Upload syllabus files first to extract skills.</p>
        </div>
        <button onClick={() => setResearcherStep("upload")} className="btn btn-primary text-sm">
          ← Back to Upload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm"
        style={{ background: "#e9f5ee", border: "1px solid #a7d6be", color: "#1e4d38" }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#2d6a4f" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>
          Extracted <strong>{plos.length} skills</strong> from your syllabus. Review below, then edit in the next step.
        </span>
      </div>

      {/* List */}
      <div
        className="rounded-xl border divide-y overflow-hidden"
        style={{ borderColor: "var(--line)", background: "#fff" }}
      >
        {plos.map((plo, i) => (
          <div key={plo.id} className="px-5 py-3.5 flex items-start gap-3.5">
            <span
              className="font-mono-custom text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
              style={{ background: "var(--ink-pale)", color: "var(--ink)" }}
            >
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{plo.shortTitle}</div>
              {plo.paraphrase && (
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-2)" }}>{plo.paraphrase}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => setResearcherStep("review")} className="btn btn-primary">
          Edit skill pool →
        </button>
      </div>
    </div>
  );
}

// ── Launch view ──────────────────────────────────────────────────────────────

type LaunchStatus = "checking" | "idle" | "launching" | "live" | "error";

function LaunchView({ copied, setCopied }: { copied: boolean; setCopied: (v: boolean) => void }) {
  const { session, setLaunched, loadServerSession } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/respondent`;

  const [status,   setStatus]   = useState<LaunchStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [launchedAt, setLaunchedAt] = useState<string | null>(null);

  // On mount: check whether a session is already live on the server.
  // This correctly handles page refresh and re-navigation.
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.launched && Array.isArray(data.plos) && data.plos.length > 0) {
          setLaunched();
          loadServerSession(data.sessionId ?? session?.id ?? "server", data.plos);
          setLaunchedAt(data.launchedAt ?? null);
          setStatus("live");
        } else {
          setStatus("idle");
        }
      })
      .catch(() => setStatus("idle"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLaunch() {
    if (!session || plos.length < 12) return;
    setStatus("launching");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, plos }),
      });
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setStatus("error");
      } else {
        // ok:true (KV stored) or ok:false with reason (no KV, device-local only)
        setLaunched();
        setLaunchedAt(new Date().toISOString());
        setStatus("live");
      }
    } catch {
      setErrorMsg("Network error — check your connection and try again.");
      setStatus("error");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const ready = plos.length >= 12 && plos.length <= 25;

  // ── Checking ──────────────────────────────────────────────────────────────
  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3" style={{ color: "var(--text-3)" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="22 10" strokeLinecap="round"/>
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span className="text-sm">Checking session status…</span>
        </div>
      </div>
    );
  }

  // ── Not ready ─────────────────────────────────────────────────────────────
  if (!ready && status !== "live") {
    return (
      <div
        className="rounded-xl p-5 flex items-start gap-4"
        style={{ background: "#fef9e7", border: "1px solid #fcd34d" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#d97706" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 5v5M9 13v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: "#78350f" }}>Not ready to launch</div>
          <div className="text-sm mt-0.5" style={{ color: "#92400e" }}>
            You have {plos.length} skills. The study needs 12–25 to be valid.
          </div>
        </div>
      </div>
    );
  }

  // ── Live ──────────────────────────────────────────────────────────────────
  if (status === "live") {
    return (
      <div className="space-y-6">
        {/* Live status banner */}
        <div
          className="rounded-xl p-5 flex items-center gap-4"
          style={{ background: "#e9f5ee", border: "1px solid #a7d6be" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#2d6a4f" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9l3.5 3.5 6.5-6.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm" style={{ color: "#1e4d38" }}>Session is live</div>
              <span className="font-mono-custom text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#2d6a4f", color: "#fff" }}>
                LIVE
              </span>
            </div>
            <div className="text-sm mt-0.5" style={{ color: "#2d6a4f" }}>
              Respondents on any device can now access the study link.
              {launchedAt && (
                <span style={{ opacity: 0.7 }}>
                  {" "}Launched at {new Date(launchedAt).toLocaleTimeString()}.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Respondent link */}
        <div>
          <div className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Respondent link — share this
          </div>
          <div className="flex gap-2 items-stretch">
            <div
              className="flex-1 px-4 py-3 rounded-xl font-mono-custom text-sm overflow-hidden text-ellipsis whitespace-nowrap flex items-center"
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              {link}
            </div>
            <button
              onClick={copyLink}
              className="btn px-5 transition-all"
              style={{ background: copied ? "#1e5c38" : "var(--ink)", color: "#fff", minWidth: 90 }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Skill pool summary */}
        <div>
          <div className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
            Active skill pool ({plos.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {plos.map((plo, i) => (
              <span
                key={plo.id}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "var(--ink-pale)", color: "var(--ink)", border: "1px solid var(--line)" }}
              >
                {i + 1}. {plo.shortTitle}
              </span>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--line-soft)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Next steps</div>
          {[
            "Share the link with your cohort (target: 15–20 respondents).",
            "Each respondent completes independently — takes ~10–15 minutes.",
            "After completion, review results at /results.",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--text)" }}>
              <span className="font-mono-custom text-[10px] flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded" style={{ background: "var(--ink-pale)", color: "var(--ink)" }}>
                {i + 1}
              </span>
              {text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Idle / Error — show Launch button ────────────────────────────────────
  return (
    <div className="space-y-7">
      {/* Ready banner */}
      <div className="rounded-xl p-5 flex items-start gap-4" style={{ background: "#e9f5ee", border: "1px solid #a7d6be" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#2d6a4f" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9l3.5 3.5 6.5-6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: "#1e4d38" }}>Ready to launch</div>
          <div className="text-sm mt-0.5" style={{ color: "#2d6a4f" }}>
            {plos.length} skills configured. Clicking Launch will publish the session to the server — respondents on any device will then be able to access the study.
          </div>
        </div>
      </div>

      {/* Skill pool */}
      <div>
        <div className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
          Skill pool ({plos.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {plos.map((plo, i) => (
            <span
              key={plo.id}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "var(--ink-pale)", color: "var(--ink)", border: "1px solid var(--line)" }}
            >
              {i + 1}. {plo.shortTitle}
            </span>
          ))}
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#9a3412" }}>
          {errorMsg}
        </div>
      )}

      {/* Launch button */}
      <div className="pt-2">
        <button
          onClick={handleLaunch}
          disabled={status === "launching" || !ready}
          className="w-full py-4 rounded-xl font-semibold text-base disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          style={{
            background: "var(--ink)",
            color: "#fff",
            boxShadow: "0 4px 16px rgba(12,35,64,0.25)",
            letterSpacing: "-0.01em",
          }}
        >
          {status === "launching" ? (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="22 10" strokeLinecap="round"/>
              </svg>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Publishing to server…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L11.5 7H16L12 10.5L13.5 16L9 13L4.5 16L6 10.5L2 7H6.5L9 2Z" fill="rgba(255,255,255,0.9)"/>
              </svg>
              Launch Session
            </>
          )}
        </button>
        <p className="text-xs text-center mt-3" style={{ color: "var(--text-3)" }}>
          This publishes the session server-side. Respondents can access it from any device immediately.
        </p>
      </div>
    </div>
  );
}
