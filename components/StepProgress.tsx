"use client";
import { RESPONDENT_STEPS, RespondentStep } from "@/lib/types";

interface StepProgressProps {
  currentStep: RespondentStep;
  dark?: boolean;
}

export function StepProgress({ currentStep, dark = false }: StepProgressProps) {
  const visible    = RESPONDENT_STEPS.filter((s) => s.key !== "complete" && s.key !== "intro");
  const currentIdx = visible.findIndex((s) => s.key === currentStep);
  const currentInfo = visible.find((s) => s.key === currentStep);
  const progress   =
    currentStep === "complete"
      ? 100
      : currentIdx < 0
      ? 0
      : Math.round(((currentIdx + 1) / visible.length) * 100);

  const trackColor = dark ? "rgba(255,255,255,0.08)" : "var(--line)";
  const fillColor  = dark
    ? "linear-gradient(90deg,#60a5fa 0%,#c084fc 100%)"
    : "linear-gradient(90deg,var(--ink) 0%,var(--rust) 100%)";

  return (
    <div style={{ width: "100%" }}>
      {/* Step label + counter row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{
          fontSize: 11,
          fontFamily: "'Fira Code', monospace",
          fontWeight: 600,
          color: dark ? "rgba(255,255,255,0.55)" : "var(--ink-soft)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          {currentInfo?.label ?? ""}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
          color: dark ? "rgba(255,255,255,0.22)" : "var(--text-3)",
        }}>
          {Math.max(currentIdx + 1, 0)}&nbsp;/&nbsp;{visible.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: trackColor, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: fillColor,
          borderRadius: 3,
          transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      {/* Step dots + labels */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        {visible.map((step, idx) => {
          const isDone    = currentStep === "complete" || currentIdx > idx;
          const isCurrent = step.key === currentStep;

          const dotBg = isDone
            ? (dark ? "rgba(255,255,255,0.45)" : "var(--rust)")
            : isCurrent
            ? (dark ? "#60a5fa" : "var(--ink)")
            : (dark ? "rgba(255,255,255,0.1)" : "var(--line)");

          const labelColor = isCurrent
            ? (dark ? "#93c5fd" : "var(--ink)")
            : isDone
            ? (dark ? "rgba(255,255,255,0.35)" : "var(--rust)")
            : (dark ? "rgba(255,255,255,0.18)" : "var(--text-3)");

          return (
            <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{
                width: isCurrent ? 8 : 6,
                height: isCurrent ? 8 : 6,
                borderRadius: "50%",
                background: dotBg,
                transition: "all 0.3s ease",
                boxShadow: isCurrent
                  ? dark ? "0 0 0 3px rgba(96,165,250,0.2)" : "0 0 0 3px var(--ink-pale)"
                  : "none",
              }} />
              <span style={{
                fontSize: 9,
                fontFamily: "'Fira Code', monospace",
                fontWeight: isCurrent ? 600 : 400,
                color: labelColor,
                whiteSpace: "nowrap",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "color 0.3s ease",
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
