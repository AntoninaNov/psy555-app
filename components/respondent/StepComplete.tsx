"use client";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import { useRouter } from "next/navigation";

const WEIGHT_LABELS = ["", "Distant", "Nearby", "Adjacent"] as const;
const W_COLOR       = ["", "#60a5fa", "#34d399", "#f59e0b"] as const;

type SubmitState = "idle" | "submitting" | "done" | "error";

export function StepComplete() {
  const { session, completeRespondent } = useAppStore();
  const router = useRouter();
  const submitted = useRef(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const rd   = session?.respondentData;
  const plos = session?.normalizedPLOs ?? [];

  useEffect(() => {
    if (!rd || submitted.current) return;
    submitted.current = true;

    // Mark session complete in store (also appends to completedSessions array)
    completeRespondent();

    // Submit to server
    const finishedData = { ...rd, completedAt: rd.completedAt ?? new Date().toISOString() };
    setSubmitState("submitting");
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finishedData),
    })
      .then((r) => {
        setSubmitState(r.ok ? "done" : "error");
      })
      .catch(() => setSubmitState("error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rd) return null;

  const metrics = computeMetrics(rd);

  const stats = [
    { label: "Skills selected",    value: metrics.nodeCount,                  sub: `out of ${plos.length}`, color: "var(--ink)" },
    { label: "Connections drawn",  value: metrics.edgeCount,                  sub: "total links",           color: "var(--ink-mid)" },
    { label: "Avg link strength",  value: metrics.avgEdgeWeight.toFixed(2),   sub: "on 1–3 scale",          color: "#2d6a4f" },
    { label: "Zombie skills",      value: metrics.zombieSkillCount,            sub: "no strong links",       color: "var(--rust)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* Hero */}
      <div style={{ background: "var(--ink)", padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none" }}>
          <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" fill="none">
            <circle cx="80"  cy="100" r="30" stroke="white" strokeWidth="1"/>
            <circle cx="200" cy="60"  r="20" stroke="white" strokeWidth="1"/>
            <circle cx="320" cy="110" r="25" stroke="white" strokeWidth="1"/>
            <circle cx="440" cy="50"  r="18" stroke="white" strokeWidth="1"/>
            <circle cx="520" cy="110" r="22" stroke="white" strokeWidth="1"/>
            <line x1="80"  y1="100" x2="200" y2="60"  stroke="white" strokeWidth="0.8"/>
            <line x1="200" y1="60"  x2="320" y2="110" stroke="white" strokeWidth="0.8"/>
            <line x1="320" y1="110" x2="440" y2="50"  stroke="white" strokeWidth="0.8"/>
            <line x1="440" y1="50"  x2="520" y2="110" stroke="white" strokeWidth="0.8"/>
            <line x1="80"  y1="100" x2="320" y2="110" stroke="white" strokeWidth="0.5"/>
          </svg>
        </div>

        <div className="anim-up" style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M7 16l6 6 12-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="font-display anim-up-1" style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 600, color: "#fff", letterSpacing: "-0.03em", marginBottom: 12 }}>
          Study complete!
        </h1>
        <p className="anim-up-2" style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, maxWidth: 380, margin: "0 auto 20px" }}>
          Your cognitive map has been recorded. Thank you for your contribution to the research.
        </p>

        {/* Submission status pill */}
        <div className="anim-up-3" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
          {submitState === "submitting" && (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>Submitting data…</span>
            </>
          )}
          {submitState === "done" && (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>Data submitted ✓</span>
            </>
          )}
          {submitState === "error" && (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>Saved locally — no server sync</span>
            </>
          )}
          {submitState === "idle" && (
            <>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Fira Code', monospace" }}>Finalising…</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "40px 24px 48px", width: "100%" }}>

        {/* Stats */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 14 }}>Your results</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {stats.map(({ label, value, sub, color }) => (
              <div key={label} className="anim-up-1" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px", textAlign: "center", boxShadow: "var(--sh-xs)" }}>
                <div className="font-display" style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection breakdown */}
        {rd.edges.length > 0 && (
          <div className="anim-up-2" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "20px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 14 }}>Connection breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([1, 2, 3] as const).map((w) => {
                const count = rd.edges.filter((e) => e.weight === w).length;
                if (count === 0) return null;
                const pct = Math.round((count / rd.edges.length) * 100);
                return (
                  <div key={w}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 3 + (w - 1) * 1.5, background: W_COLOR[w], borderRadius: 2, opacity: 0.8 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: W_COLOR[w] }}>{WEIGHT_LABELS[w]}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "'Fira Code', monospace" }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: W_COLOR[w], borderRadius: 2, opacity: 0.65, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GPA */}
        {rd.gpa != null && (
          <div className="anim-up-3" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 12, background: "var(--bg-subtle)", border: "1px solid var(--line-soft)", marginBottom: 24 }}>
            <span style={{ fontSize: 13, color: "var(--text-2)" }}>GPA recorded</span>
            <span className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>{rd.gpa}</span>
          </div>
        )}

        <div className="anim-up-4" style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 16 }}>You may close this tab.</p>
        </div>
      </div>
    </div>
  );
}
