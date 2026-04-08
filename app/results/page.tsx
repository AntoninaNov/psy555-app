"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useHasHydrated } from "@/lib/useHydration";
import { computeMetrics } from "@/lib/metrics";
import { downloadJSON, downloadCSV } from "@/lib/export";
import { CLUSTER_COLORS, RespondentData, StudySession } from "@/lib/types";

const W_COLOR = ["", "#60a5fa", "#34d399", "#f59e0b"] as const;
const W_LABEL = ["", "Distant", "Nearby", "Adjacent"] as const;

// ── Interpretation helpers ─────────────────────────────────────────────────────
function navInterp(pct: number) {
  if (pct >= 80) return { label: "Efficient",  color: "#10b981", bg: "#e9f5ee" };
  if (pct >= 50) return { label: "Moderate",   color: "#f59e0b", bg: "#fffbeb" };
  return              { label: "Indirect",    color: "#ef4444", bg: "#fef2f2" };
}
function bridgeInterp(pct: number) {
  if (pct >= 60) return { label: "Strong hub", color: "#10b981", bg: "#e9f5ee" };
  if (pct >= 30) return { label: "Partial",    color: "#f59e0b", bg: "#fffbeb" };
  return              { label: "Weak hub",   color: "#ef4444", bg: "#fef2f2" };
}
function cniTier(pct: number) {
  if (pct >= 75) return { label: "Expert Navigator", color: "#7c3aed", bg: "#f5f0ff" };
  if (pct >= 50) return { label: "Competent",        color: "#0891b2", bg: "#e0f2fe" };
  if (pct >= 25) return { label: "Developing",       color: "#f59e0b", bg: "#fffbeb" };
  return              { label: "Limited",            color: "#ef4444", bg: "#fef2f2" };
}
function cniScore(rd: RespondentData): number | null {
  const n = rd.pathfinding?.accuracy;
  const b = rd.perturbation?.bridgeAccuracy;
  if (n != null && b != null) return Math.round(((n + b) / 2) * 100);
  if (n != null) return Math.round(n * 100);
  if (b != null) return Math.round(b * 100);
  return null;
}
function avg(vals: number[]) { return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; }
function sd(vals: number[]) {
  if (vals.length < 2) return 0;
  const m = avg(vals);
  return Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length);
}

// ── Gate screen ────────────────────────────────────────────────────────────────
function Gate({ title, body, cta, onCta }: { title: string; body: string; cta: string; onCta: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="rounded-2xl border p-12 max-w-sm text-center space-y-5" style={{ background: "#fff", borderColor: "var(--line)", boxShadow: "var(--sh-md)" }}>
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "var(--ink-pale)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 2"/><path d="M12 8v5M12 15.5v.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold" style={{ color: "var(--ink)" }}>{title}</h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-2)" }}>{body}</p>
        </div>
        <button onClick={onCta} className="btn btn-primary w-full justify-center">{cta}</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { session, completedSessions: localSessions, resetRespondent, deleteCompletedSession } = useAppStore();
  const router   = useRouter();
  const hydrated = useHasHydrated();

  // Sessions fetched from API (server-side KV)
  const [remoteSessions, setRemoteSessions] = useState<RespondentData[]>([]);
  const [kvConfigured, setKvConfigured]     = useState(false);
  const [fetchDone, setFetchDone]           = useState(false);
  const [selectedId, setSelectedId]         = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(({ sessions, kvConfigured: kvc }) => {
        setRemoteSessions(sessions ?? []);
        setKvConfigured(!!kvc);
      })
      .catch(() => {})
      .finally(() => setFetchDone(true));
  }, []);

  if (!hydrated) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  if (!session || session.normalizedPLOs.length === 0) {
    return <Gate title="No session configured" body="Set up a session via researcher setup first." cta="Researcher setup" onCta={() => router.push("/")} />;
  }

  // Merge remote + local sessions (deduplicate by id, prefer remote if duplicated)
  const remoteIds = new Set(remoteSessions.map((r) => r.id));
  const localOnly = localSessions.filter((r) => !remoteIds.has(r.id));
  const allSessions: RespondentData[] = [...remoteSessions, ...localOnly].sort(
    (a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
  );

  const completedAll = allSessions.filter((r) => !!r.completedAt);
  const plos = session.normalizedPLOs;

  // ── Selected respondent detail view ────────────────────────────────────────
  const selected = selectedId ? completedAll.find((r) => r.id === selectedId) ?? null : null;
  if (selected) {
    return (
      <DetailView
        rd={selected}
        session={session}
        onBack={() => setSelectedId(null)}
        onDelete={async () => {
          // Delete from server
          await fetch(`/api/sessions?id=${selected.id}`, { method: "DELETE" });
          // Delete from local store
          deleteCompletedSession(selected.id);
          // Remove from remote list
          setRemoteSessions((prev) => prev.filter((r) => r.id !== selected.id));
          setSelectedId(null);
        }}
      />
    );
  }

  // ── Aggregate view ─────────────────────────────────────────────────────────
  const cniValues       = completedAll.map(cniScore).filter((v): v is number => v != null);
  const navValues       = completedAll.map((r) => r.pathfinding?.accuracy).filter((v): v is number => v != null).map(v => Math.round(v * 100));
  const bridgeValues    = completedAll.map((r) => r.perturbation?.bridgeAccuracy).filter((v): v is number => v != null).map(v => Math.round(v * 100));
  const gpaValues       = completedAll.map((r) => r.gpa).filter((v): v is number => v != null);

  function handleDeleteServer(id: string) {
    fetch(`/api/sessions?id=${id}`, { method: "DELETE" }).then(() => {
      setRemoteSessions((prev) => prev.filter((r) => r.id !== id));
    });
    deleteCompletedSession(id);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b" style={{ background: "rgba(245,242,236,0.97)", borderColor: "var(--line)", backdropFilter: "blur(14px)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-custom text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--ink)", color: "#fff", letterSpacing: "0.08em" }}>RESEARCHER</span>
              <div className="font-display font-semibold text-base" style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}>All Sessions</div>
            </div>
            <div className="text-[10px] font-mono-custom mt-0.5" style={{ color: "var(--text-3)" }}>
              {completedAll.length} respondent{completedAll.length !== 1 ? "s" : ""} · {kvConfigured ? "KV synced" : "local only"} · {plos.length} skills configured
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!kvConfigured && fetchDone && (
              <span className="text-[10px] font-mono-custom px-2.5 py-1 rounded-lg" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d" }}>
                KV not set up — local only
              </span>
            )}
            <button onClick={() => { resetRespondent(); router.push("/"); }} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--ink)", color: "#fff" }}>
              New session
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── KV setup notice ── */}
        {!kvConfigured && fetchDone && (
          <div style={{ borderRadius: 12, padding: "14px 18px", background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
            <strong>Server storage not configured.</strong> Respondent data is stored locally on this device only.
            To collect data across devices, add <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>KV_REST_API_URL</code> and <code style={{ background: "#fef3c7", padding: "1px 5px", borderRadius: 4 }}>KV_REST_API_TOKEN</code> as Vercel environment variables (connect a Vercel KV or Upstash Redis store from your Vercel dashboard → Storage).
          </div>
        )}

        {/* ── Aggregate stats ── */}
        {completedAll.length > 0 && (
          <section>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
              Aggregate — {completedAll.length} respondent{completedAll.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {[
                { label: "Cognitive Nav Index", vals: cniValues,    color: "#7c3aed", fmt: (v: number) => `${v}%` },
                { label: "Navigation Accuracy", vals: navValues,    color: "#7c3aed", fmt: (v: number) => `${v}%` },
                { label: "Bridge Accuracy",     vals: bridgeValues, color: "#b45309", fmt: (v: number) => `${v}%` },
                { label: "GPA (control)",        vals: gpaValues,    color: "var(--rust)", fmt: (v: number) => v.toFixed(1) },
                { label: "Respondents",          vals: [completedAll.length], color: "var(--ink)", fmt: (v: number) => String(v) },
              ].map(({ label, vals, color, fmt }) => (
                <div key={label} style={{ borderRadius: 12, border: "1px solid var(--line)", padding: "14px 12px", background: "#fff", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>
                    {vals.length > 0 ? fmt(Math.round(avg(vals))) : "—"}
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text)", fontFamily: "'Sora', sans-serif", marginTop: 3, marginBottom: 2 }}>{label}</div>
                  {vals.length > 1 && (
                    <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>
                      SD {fmt(Math.round(sd(vals)))} · n={vals.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Respondent table ── */}
        <section>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
            Respondent sessions
          </div>

          {completedAll.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-3)" }}>No completed sessions yet.</p>
              <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>Share the respondent link — sessions appear here as they complete.</p>
              <button onClick={() => router.push("/")} className="btn btn-primary mt-4 text-xs">Go to researcher setup →</button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 70px 80px 100px", borderBottom: "1px solid var(--line-soft)", background: "var(--surface-alt)" }}>
                {["Respondent", "CNI", "NavAcc", "Bridge", "GPA", "Time", "Actions"].map((h) => (
                  <div key={h} style={{ padding: "8px 14px", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>{h}</div>
                ))}
              </div>

              {completedAll.map((rd, i) => {
                const cni  = cniScore(rd);
                const nav  = rd.pathfinding  ? Math.round(rd.pathfinding.accuracy * 100) : null;
                const bri  = rd.perturbation ? Math.round(rd.perturbation.bridgeAccuracy * 100) : null;
                const metrics = computeMetrics(rd);
                const isRemote = remoteIds.has(rd.id);

                return (
                  <div
                    key={rd.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 70px 80px 100px", borderTop: i > 0 ? "1px solid var(--line-soft)" : "none", background: i % 2 === 0 ? "#fff" : "#fafafa", alignItems: "center" }}
                  >
                    {/* ID + date */}
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: "'Fira Code', monospace", color: "var(--ink)", fontWeight: 600 }}>{rd.id.slice(0, 8)}</span>
                        {isRemote && <span style={{ fontSize: 8, background: "#e0f2fe", color: "#0891b2", padding: "1px 5px", borderRadius: 6, fontFamily: "'Fira Code', monospace", fontWeight: 700 }}>SERVER</span>}
                        {!isRemote && <span style={{ fontSize: 8, background: "var(--ink-pale)", color: "var(--text-3)", padding: "1px 5px", borderRadius: 6, fontFamily: "'Fira Code', monospace" }}>LOCAL</span>}
                      </div>
                      <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 2 }}>{rd.completedAt?.slice(0, 16).replace("T", " ") ?? "—"}</div>
                    </div>
                    {/* CNI */}
                    <div style={{ padding: "10px 14px" }}>
                      {cni != null ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: cniTier(cni).color, fontFamily: "'Sora', sans-serif" }}>{cni}%</span>
                      ) : <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
                    </div>
                    {/* Nav */}
                    <div style={{ padding: "10px 14px" }}>
                      {nav != null ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: navInterp(nav).color, fontFamily: "'Sora', sans-serif" }}>{nav}%</span>
                      ) : <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
                    </div>
                    {/* Bridge */}
                    <div style={{ padding: "10px 14px" }}>
                      {bri != null ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: bridgeInterp(bri).color, fontFamily: "'Sora', sans-serif" }}>{bri}%</span>
                      ) : <span style={{ color: "var(--text-3)", fontSize: 11 }}>—</span>}
                    </div>
                    {/* GPA */}
                    <div style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 12, color: "var(--ink)", fontFamily: "'Sora', sans-serif" }}>{rd.gpa ?? "—"}</span>
                    </div>
                    {/* Time */}
                    <div style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontFamily: "'Fira Code', monospace", color: "var(--text-2)" }}>{metrics.totalMinutes}m</span>
                    </div>
                    {/* Actions */}
                    <div style={{ padding: "10px 14px", display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setSelectedId(rd.id)}
                        style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 600 }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteServer(rd.id)}
                        style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}
                        title="Delete this session"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Export all ── */}
        {completedAll.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, paddingBottom: 40 }}>
            <button
              onClick={() => {
                const rows = [
                  "respondent_id,completed_at,cni,nav_accuracy,nav_time_s,bridge_accuracy,adapt_time_s,gpa,cluster_count,node_count,edge_count,total_minutes",
                  ...completedAll.map((rd) => {
                    const m = computeMetrics(rd);
                    const cni = cniScore(rd);
                    return [
                      rd.id,
                      rd.completedAt?.slice(0, 19) ?? "",
                      cni ?? "",
                      m.pathfindingAccuracy != null ? Math.round(m.pathfindingAccuracy * 100) : "",
                      m.pathfindingTimeMs != null ? Math.round(m.pathfindingTimeMs / 1000) : "",
                      m.bridgeAccuracy != null ? Math.round(m.bridgeAccuracy * 100) : "",
                      m.perturbationTimeMs != null ? Math.round(m.perturbationTimeMs / 1000) : "",
                      rd.gpa ?? "",
                      m.clusterCount,
                      m.nodeCount,
                      m.edgeCount,
                      m.totalMinutes,
                    ].join(",");
                  }),
                ].join("\n");
                const blob = new Blob([rows], { type: "text/csv" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `psy555-all-sessions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
              }}
              className="text-sm font-semibold px-7 py-3.5 rounded-xl border"
              style={{ borderColor: "var(--ink)", color: "var(--ink)", background: "#fff" }}
            >
              Export all as CSV
            </button>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify({ sessions: completedAll, plos }, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `psy555-all-sessions-${new Date().toISOString().slice(0, 10)}.json`; a.click();
              }}
              className="text-sm font-semibold px-7 py-3.5 rounded-xl"
              style={{ background: "var(--rust)", color: "#fff" }}
            >
              Export all as JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Individual session detail view ────────────────────────────────────────────

function DetailView({ rd, session, onBack, onDelete }: { rd: RespondentData; session: StudySession; onBack: () => void; onDelete: () => void }) {
  const router = useRouter();
  const metrics = computeMetrics(rd);
  const ploMap  = new Map(session.normalizedPLOs.map((p) => [p.id, p]));

  const pf = rd.pathfinding;
  const pt = rd.perturbation;
  const navPct    = pf ? Math.round(pf.accuracy * 100) : null;
  const bridgePct = pt ? Math.round(pt.bridgeAccuracy * 100) : null;
  const cni       = cniScore(rd);

  const navI    = navPct    != null ? navInterp(navPct)    : null;
  const bridgeI = bridgePct != null ? bridgeInterp(bridgePct) : null;
  const cniT    = cni       != null ? cniTier(cni)         : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="sticky top-0 z-20 border-b" style={{ background: "rgba(245,242,236,0.97)", borderColor: "var(--line)", backdropFilter: "blur(14px)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button onClick={onBack} style={{ fontSize: 12, color: "var(--text-2)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>← All sessions</button>
              <span style={{ color: "var(--line)" }}>·</span>
              <span className="font-mono-custom text-xs" style={{ color: "var(--ink)" }}>{rd.id.slice(0, 12)}</span>
            </div>
            <div className="text-[10px] font-mono-custom mt-0.5" style={{ color: "var(--text-3)" }}>
              {rd.completedAt?.slice(0, 16).replace("T", " ")} · {metrics.totalMinutes} min
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadCSV(session)} className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--line)", color: "var(--text-2)", background: "#fff" }}>CSV</button>
            <button onClick={() => downloadJSON(session)} className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: "var(--line)", color: "var(--text-2)", background: "#fff" }}>JSON</button>
            <button
              onClick={() => { if (confirm("Delete this respondent's data?")) onDelete(); }}
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }}
            >
              Delete
            </button>
            <button onClick={() => router.push("/")} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "var(--ink)", color: "#fff" }}>New session</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Data completeness ── */}
        <section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {[
              { label: "Map",          ok: rd.nodes.length > 0, detail: `${metrics.nodeCount} concepts · ${metrics.edgeCount} links` },
              { label: "GPA",          ok: rd.gpa != null,       detail: rd.gpa != null ? `Reported: ${rd.gpa}` : "Missing" },
              { label: "Navigate",     ok: pf != null,           detail: pf ? `${navPct}% accuracy` : "Skipped" },
              { label: "Adapt",        ok: pt != null,           detail: pt ? `${bridgePct}% accuracy` : "Skipped" },
              { label: "Full dataset", ok: rd.nodes.length > 0 && rd.gpa != null && pf != null && pt != null, detail: "All variables recorded" },
            ].map(({ label, ok, detail }) => (
              <div key={label} style={{ borderRadius: 12, border: `1px solid ${ok ? "#a7d6be" : "var(--line)"}`, background: ok ? "#f0faf5" : "#fff", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: ok ? "#2d6a4f" : "#d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {ok
                      ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 4h4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    }
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: ok ? "#1e4d38" : "var(--text-2)" }}>{label}</span>
                </div>
                <div style={{ fontSize: 9.5, color: ok ? "#2d6a4f" : "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>{detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CNI hero ── */}
        {cni != null && cniT != null && (
          <section style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", gap: 32, boxShadow: "var(--sh-sm)" }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, color: cniT.color, fontFamily: "'Sora', sans-serif" }}>{cni}%</div>
              <div style={{ marginTop: 6, display: "inline-flex", padding: "4px 12px", borderRadius: 20, background: cniT.bg }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: cniT.color }}>{cniT.label}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>NAVIGATION ACCURACY</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#f5f0ff", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${navPct ?? 0}%`, background: "#7c3aed", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: navI?.color ?? "var(--text-3)", flexShrink: 0 }}>{navPct != null ? `${navPct}%` : "—"}</span>
                  </div>
                  {navI && <div style={{ fontSize: 9.5, color: navI.color, marginTop: 2 }}>{navI.label}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>BRIDGE ACCURACY</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "#fef3c7", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${bridgePct ?? 0}%`, background: "#b45309", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: bridgeI?.color ?? "var(--text-3)", flexShrink: 0 }}>{bridgePct != null ? `${bridgePct}%` : "—"}</span>
                  </div>
                  {bridgeI && <div style={{ fontSize: 9.5, color: bridgeI.color, marginTop: 2 }}>{bridgeI.label}</div>}
                </div>
              </div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "center", paddingLeft: 24, borderLeft: "1px solid var(--line-soft)" }}>
              <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>GPA CONTROL</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: rd.gpa != null ? "var(--rust)" : "var(--text-3)", fontFamily: "'Sora', sans-serif" }}>{rd.gpa ?? "—"}</div>
            </div>
          </section>
        )}

        {/* ── Task detail cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Navigate */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "var(--line)" }}>
            <div style={{ background: "#7c3aed", padding: "12px 18px" }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>TASK 1 — NAVIGATE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Pathfinding</div>
            </div>
            <div style={{ padding: 18 }}>
              {pf ? (
                <>
                  <div style={{ fontSize: 44, fontWeight: 800, color: "#7c3aed", fontFamily: "'Sora', sans-serif", lineHeight: 1, marginBottom: 8 }}>{navPct}%</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div><div style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>CHOSEN</div><div style={{ fontSize: 14, fontWeight: 700 }}>{pf.chosenPath.length - 1} hops</div></div>
                    <div><div style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>OPTIMAL</div><div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{pf.optimalLength} hops</div></div>
                    <div><div style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>TIME</div><div style={{ fontSize: 14, fontWeight: 700 }}>{(pf.timeMs/1000).toFixed(0)}s</div></div>
                  </div>
                  <div style={{ fontSize: 8.5, color: "var(--text-3)", fontFamily: "'Fira Code', monospace", marginBottom: 4 }}>PATH TAKEN</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {pf.chosenPath.map((id, i) => (
                      <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        {i > 0 && <span style={{ color: "#c4b5fd", fontSize: 9 }}>→</span>}
                        <span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 8, background: (i === 0 || i === pf.chosenPath.length - 1) ? "#7c3aed" : "#f5f0ff", color: (i === 0 || i === pf.chosenPath.length - 1) ? "#fff" : "#7c3aed", fontWeight: 600 }}>
                          {ploMap.get(id)?.shortTitle ?? id}
                        </span>
                      </span>
                    ))}
                  </div>
                </>
              ) : <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>Skipped</div>}
            </div>
          </div>

          {/* Adapt */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "var(--line)" }}>
            <div style={{ background: "#b45309", padding: "12px 18px" }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", fontFamily: "'Fira Code', monospace" }}>TASK 2 — ADAPT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Bridge / Hub</div>
            </div>
            <div style={{ padding: 18 }}>
              {pt ? (
                <>
                  <div style={{ fontSize: 44, fontWeight: 800, color: "#b45309", fontFamily: "'Sora', sans-serif", lineHeight: 1, marginBottom: 8 }}>{bridgePct}%</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div><div style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>TIME</div><div style={{ fontSize: 14, fontWeight: 700 }}>{(pt.timeMs/1000).toFixed(0)}s</div></div>
                    <div><div style={{ fontSize: 8, color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>SHARED</div><div style={{ fontSize: 14, fontWeight: 700, color: bridgeI?.color }}>{bridgePct}%</div></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5" }}>
                      <div style={{ fontSize: 8, color: "#b91c1c", fontFamily: "'Fira Code', monospace" }}>DISRUPTED HUB</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#b91c1c", textDecoration: "line-through", opacity: 0.75 }}>{ploMap.get(pt.removedId)?.shortTitle ?? pt.removedId}</div>
                    </div>
                    <div style={{ padding: "7px 10px", borderRadius: 8, background: bridgeI?.bg ?? "#fffbeb", border: `1px solid ${bridgeI?.color ?? "#b45309"}40` }}>
                      <div style={{ fontSize: 8, color: bridgeI?.color ?? "#b45309", fontFamily: "'Fira Code', monospace" }}>CHOSEN BRIDGE</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: bridgeI?.color ?? "#b45309" }}>{ploMap.get(pt.bridgeChoiceId)?.shortTitle ?? pt.bridgeChoiceId}</div>
                    </div>
                  </div>
                </>
              ) : <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>Skipped</div>}
            </div>
          </div>
        </div>

        {/* ── Map structure ── */}
        <section className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "var(--line)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--line-soft)", background: "var(--surface-alt)" }}>
            <h2 className="font-display text-base font-semibold" style={{ color: "var(--ink)" }}>Knowledge map structure</h2>
          </div>
          <div className="p-6">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Concepts",    value: metrics.nodeCount },
                { label: "Connections", value: metrics.edgeCount },
                { label: "Clusters",    value: metrics.clusterCount },
                { label: "Avg weight",  value: metrics.avgEdgeWeight.toFixed(2) },
                { label: "Weight SD",   value: metrics.edgeWeightSD.toFixed(2) },
                { label: "Isolated",    value: metrics.zombieSkillCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "'Sora', sans-serif" }}>{value}</div>
                  <div style={{ fontSize: 9.5, color: "var(--text-3)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Edge weight bars */}
            {rd.edges.length > 0 && (
              <div style={{ display: "flex", gap: 16 }}>
                {([1, 2, 3] as const).map((w) => {
                  const count = rd.edges.filter(e => e.weight === w).length;
                  const pct   = Math.round((count / rd.edges.length) * 100);
                  return (
                    <div key={w} style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
                        <span style={{ color: W_COLOR[w] }}>{W_LABEL[w]}</span>
                        <span style={{ color: "var(--text-3)", fontFamily: "'Fira Code', monospace" }}>{count}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: W_COLOR[w], opacity: 0.7, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Time per step ── */}
        {Object.keys(metrics.timePerStep).length > 0 && (
          <section className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "var(--line)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "var(--line-soft)", background: "var(--surface-alt)" }}>
              <h2 className="font-display text-base font-semibold" style={{ color: "var(--ink)" }}>Time per step</h2>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(metrics.timePerStep).map(([step, mins]) => {
                const isTask = step === "pathfinding" || step === "perturbation";
                return (
                  <div key={step} className="flex items-center gap-4">
                    <span className="text-xs font-mono-custom flex-shrink-0" style={{ color: isTask ? "#7c3aed" : "var(--text-2)", width: 130, fontWeight: isTask ? 700 : 400 }}>{step}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(((mins ?? 0) / 10) * 100, 100)}%`, background: isTask ? "#7c3aed" : "var(--rust)" }} />
                    </div>
                    <span className="text-xs font-mono-custom flex-shrink-0" style={{ color: "var(--ink)", width: 52, textAlign: "right" }}>{mins} min</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
