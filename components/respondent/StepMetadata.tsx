"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";

export function StepMetadata() {
  const { session, setGpa, setRespondentStep, recordStepExit } = useAppStore();
  const [gpaRaw, setGpaRaw] = useState(
    session?.respondentData?.gpa != null ? String(session.respondentData.gpa) : ""
  );
  const [error, setError] = useState("");

  const gpaNum = parseFloat(gpaRaw.replace(",", "."));
  const valid  = gpaRaw.trim() !== "" && !isNaN(gpaNum) && gpaNum >= 1 && gpaNum <= 100;

  function submit() {
    if (!valid) {
      setError("Please enter a valid GPA (e.g. 87, or 4.5).");
      return;
    }
    setGpa(gpaNum);
    recordStepExit("metadata");
    setRespondentStep("pathfinding");
  }

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
      }}
    >
      <div
        className="anim-up"
        style={{ width: "100%", maxWidth: 420 }}
      >
        {/* Badge */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 20,
              background: "var(--ink-pale)",
              color: "var(--ink-soft)",
              fontSize: 11,
              fontFamily: "'Fira Code', monospace",
              marginBottom: 20,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 3v3M5 7.5v.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Background variable — 2 tasks follow
          </div>

          <h1
            className="font-display"
            style={{
              fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            One quick question
          </h1>

          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65 }}>
            Then two short interactive tasks — the core measures of this study.
          </p>
        </div>

        {/* Card */}
        <div
          className="anim-up-1"
          style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow: "var(--sh-md)",
          }}
        >
          {/* Question */}
          <label
            className="font-display"
            style={{
              display: "block",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}
          >
            What is your current GPA?
          </label>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.5 }}>
            Enter your grade on your institution's scale (e.g. 60–100, or 1–5).
          </p>

          {/* Input */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="number"
              step="0.1"
              min="1"
              max="100"
              placeholder="e.g. 87 or 4.5"
              value={gpaRaw}
              onChange={(e) => { setGpaRaw(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoFocus
              style={{
                display: "block",
                width: "100%",
                fontSize: 32,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                textAlign: "center",
                padding: "20px 24px",
                border: `2px solid ${error ? "#ef4444" : gpaRaw ? "var(--ink)" : "var(--line)"}`,
                borderRadius: 14,
                background: "var(--bg)",
                color: "var(--ink)",
                letterSpacing: "0.04em",
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxSizing: "border-box",
                boxShadow: gpaRaw && !error ? "0 0 0 4px var(--ink-pale)" : "none",
              }}
            />
            {error && (
              <p style={{ fontSize: 12, textAlign: "center", color: "#ef4444", marginTop: 8 }}>{error}</p>
            )}
          </div>

          {/* Privacy note */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 10,
              background: "var(--bg-subtle)",
              border: "1px solid var(--line-soft)",
              marginBottom: 24,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <rect x="2.5" y="5.5" width="9" height="7" rx="1.5" stroke="var(--text-3)" strokeWidth="1.1"/>
              <path d="M4.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="var(--text-3)" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
              Used only for anonymous statistical analysis. Individual results are never disclosed.
            </p>
          </div>

          <button
            onClick={submit}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 15, paddingTop: 14, paddingBottom: 14 }}
          >
            Continue to tasks →
          </button>
        </div>
      </div>
    </div>
  );
}
