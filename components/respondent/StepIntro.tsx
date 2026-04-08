"use client";
import { useAppStore } from "@/lib/store";

export function StepIntro() {
  const { setRespondentStep, recordStepExit, initRespondent } = useAppStore();

  function begin() {
    initRespondent();
    recordStepExit("intro");
    setRespondentStep("clustering");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Hero section */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          background: "var(--ink)",
          paddingBottom: 0,
        }}
      >
        {/* Abstract network SVG background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.12,
            pointerEvents: "none",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 260"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            {/* Background edges */}
            <line x1="80"  y1="130" x2="210" y2="70"  stroke="white" strokeWidth="1.2"/>
            <line x1="80"  y1="130" x2="210" y2="190" stroke="white" strokeWidth="2.5"/>
            <line x1="210" y1="70"  x2="370" y2="100" stroke="white" strokeWidth="1.8"/>
            <line x1="210" y1="190" x2="370" y2="160" stroke="white" strokeWidth="1"/>
            <line x1="370" y1="100" x2="520" y2="60"  stroke="white" strokeWidth="2"/>
            <line x1="370" y1="100" x2="520" y2="160" stroke="white" strokeWidth="1.2"/>
            <line x1="370" y1="160" x2="520" y2="160" stroke="white" strokeWidth="2.2"/>
            <line x1="520" y1="60"  x2="660" y2="90"  stroke="white" strokeWidth="1.5"/>
            <line x1="520" y1="160" x2="660" y2="130" stroke="white" strokeWidth="1"/>
            <line x1="660" y1="90"  x2="720" y2="130" stroke="white" strokeWidth="2"/>
            <line x1="660" y1="130" x2="720" y2="130" stroke="white" strokeWidth="1.5"/>
            <line x1="210" y1="70"  x2="210" y2="190" stroke="white" strokeWidth="0.8" strokeDasharray="5,4"/>
            <line x1="370" y1="100" x2="370" y2="160" stroke="white" strokeWidth="0.8" strokeDasharray="5,4"/>
            {/* Nodes */}
            <circle cx="80"  cy="130" r="7"  fill="white"/>
            <circle cx="210" cy="70"  r="5.5" fill="white"/>
            <circle cx="210" cy="190" r="5.5" fill="white"/>
            <circle cx="370" cy="100" r="8"  fill="white"/>
            <circle cx="370" cy="160" r="5"  fill="white"/>
            <circle cx="520" cy="60"  r="6.5" fill="white"/>
            <circle cx="520" cy="160" r="7"  fill="white"/>
            <circle cx="660" cy="90"  r="5"  fill="white"/>
            <circle cx="660" cy="130" r="5.5" fill="white"/>
            <circle cx="720" cy="130" r="7"  fill="#C84B1C"/>
          </svg>
        </div>

        {/* Grain overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
            pointerEvents: "none",
            opacity: 0.5,
          }}
        />

        <div className="relative max-w-2xl mx-auto px-6 py-14 text-center anim-up">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono-custom font-medium mb-5"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Ящук · Новак · 2025
          </div>
          <h1
            className="font-display font-semibold"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}
          >
            Cognitive Navigation<br/>in Academic Space
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
            A 15–20 minute study on how you navigate, connect, and adapt within the knowledge landscape of your program.
            No grades, no right or wrong answers.
          </p>
        </div>

        {/* Bottom fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            background: "linear-gradient(to bottom, transparent, var(--bg))",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto px-6 py-10 w-full">
        {/* Steps overview */}
        <div className="space-y-3 mb-8 anim-up-1">
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>
            What you'll do
          </div>
          {[
            {
              n: "1",
              title: "Map your knowledge territory",
              body: "Sort all course concepts into groups that feel natural to you. Mark the most central concept in each group — your anchors.",
              accent: "var(--ink)",
              bg: "var(--ink-pale)",
            },
            {
              n: "2",
              title: "Draw pathways between concepts",
              body: "Connect related concepts and rate each link as weak, moderate, or strong. You're mapping the routes through your knowledge.",
              accent: "var(--rust)",
              bg: "var(--rust-pale)",
            },
            {
              n: "3",
              title: "One background question",
              body: "Enter your current GPA — used only as a control variable. Individual results are never disclosed.",
              accent: "#2d6a4f",
              bg: "#e9f5ee",
            },
            {
              n: "4",
              title: "Navigate the map",
              body: "Find the best route between two distant concepts using the connections you drew. Measures how you reason through your own knowledge structure.",
              accent: "#7c3aed",
              bg: "#f5f0ff",
            },
            {
              n: "5",
              title: "Adapt to disruption",
              body: "One concept is removed from the landscape. Which concept would best bridge the gap? Measures reconfiguration under changing conditions.",
              accent: "#b45309",
              bg: "#fffbeb",
            },
          ].map((item) => (
            <div
              key={item.n}
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                boxShadow: "var(--sh-xs)",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-mono-custom font-bold text-sm"
                style={{ background: item.bg, color: item.accent }}
              >
                {item.n}
              </div>
              <div className="pt-0.5">
                <div className="font-display font-semibold text-base leading-none mb-1.5" style={{ color: "var(--ink)" }}>
                  {item.title}
                </div>
                <div className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {item.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Confidentiality notice */}
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3 mb-7 anim-up-2"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-soft)" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="7.5" cy="7.5" r="6" stroke="var(--text-3)" strokeWidth="1.2"/>
            <path d="M7.5 6.5v4M7.5 4.5v.5" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>Fully anonymous.</strong>{" "}
            All responses are used solely for research and are never disclosed individually. You may stop at any time.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={begin}
          className="btn btn-primary w-full justify-center anim-up-3"
          style={{ fontSize: 15, paddingTop: 16, paddingBottom: 16 }}
        >
          Begin the study
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
