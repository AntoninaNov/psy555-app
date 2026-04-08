"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { PLO } from "@/lib/types";

const MIN_PLOS = 12;
const MAX_PLOS = 25;

export function PLOEditor() {
  const { session, updatePLO, removePLO, addPLO, setResearcherStep } = useAppStore();
  const plos = session?.normalizedPLOs ?? [];

  const [editing,  setEditing]  = useState<string | null>(null);
  const [draft,    setDraft]    = useState<Partial<PLO>>({});
  const [adding,   setAdding]   = useState(false);
  const [newDraft, setNewDraft] = useState<Partial<PLO>>({});

  function startEdit(plo: PLO) {
    setEditing(plo.id);
    setDraft({ shortTitle: plo.shortTitle, paraphrase: plo.paraphrase });
  }

  function saveEdit(id: string) {
    updatePLO(id, draft);
    setEditing(null);
    setDraft({});
  }

  function saveNew() {
    if (!newDraft.shortTitle?.trim()) return;
    addPLO({
      shortTitle: newDraft.shortTitle.trim(),
      paraphrase: newDraft.paraphrase?.trim() ?? "",
    });
    setNewDraft({});
    setAdding(false);
  }

  const inRange    = plos.length >= MIN_PLOS && plos.length <= MAX_PLOS;
  const canProceed = plos.length >= MIN_PLOS;

  const bannerStyle = inRange
    ? { bg: "#e9f5ee", border: "#a7d6be", text: "#1e4d38", dot: "#2d6a4f" }
    : plos.length < MIN_PLOS
    ? { bg: "#fef2f2", border: "#fca5a5", text: "#9a3412", dot: "#ef4444" }
    : { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", dot: "#d97706" };

  return (
    <div className="space-y-5">
      {/* Count banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm"
        style={{
          background: bannerStyle.bg,
          border: `1px solid ${bannerStyle.border}`,
          color: bannerStyle.text,
        }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: bannerStyle.dot }}
        />
        <span className="font-semibold">{plos.length} skill{plos.length !== 1 ? "s" : ""}</span>
        <span style={{ color: bannerStyle.text, opacity: 0.7 }}>·</span>
        <span>
          {plos.length < MIN_PLOS
            ? `Add ${MIN_PLOS - plos.length} more to reach the minimum of ${MIN_PLOS}`
            : plos.length > MAX_PLOS
            ? `Consider removing ${plos.length - MAX_PLOS} — ideal range is ${MIN_PLOS}–${MAX_PLOS}`
            : `Within the ideal range of ${MIN_PLOS}–${MAX_PLOS}`}
        </span>
      </div>

      {/* PLO list */}
      <div className="space-y-2">
        {plos.map((plo, i) => (
          <div
            key={plo.id}
            className="rounded-xl border transition-all"
            style={{
              background: "#fff",
              borderColor: editing === plo.id ? "var(--ink)" : "var(--line)",
              boxShadow: editing === plo.id
                ? "0 0 0 3px var(--ink-pale), var(--sh-xs)"
                : "var(--sh-xs)",
            }}
          >
            {editing === plo.id ? (
              /* Edit state */
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-2)" }}>
                    Short title <span style={{ color: "var(--text-3)" }}>(shown on canvas cards)</span>
                  </label>
                  <input
                    autoFocus
                    className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none"
                    style={{
                      borderColor: "var(--line)",
                      background: "var(--bg)",
                      fontFamily: "'Sora', sans-serif",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--ink)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px var(--ink-pale)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--line)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    value={draft.shortTitle ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, shortTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-2)" }}>
                    Description <span style={{ color: "var(--text-3)" }}>(plain language, shown to respondents)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-y"
                    style={{
                      borderColor: "var(--line)",
                      background: "var(--bg)",
                      fontFamily: "'Sora', sans-serif",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--ink)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px var(--ink-pale)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--line)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    value={draft.paraphrase ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, paraphrase: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveEdit(plo.id)}
                    className="text-sm font-semibold px-4 py-2 rounded-lg"
                    style={{ background: "var(--ink)", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-sm px-4 py-2 rounded-lg border"
                    style={{ borderColor: "var(--line)", color: "var(--text-2)", background: "#fff" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View state */
              <div className="flex items-start gap-3.5 px-4 py-3.5">
                <span
                  className="font-mono-custom text-[10px] flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                  style={{ background: "var(--ink-pale)", color: "var(--ink)" }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>
                    {plo.shortTitle}
                  </div>
                  {plo.paraphrase && (
                    <div className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {plo.paraphrase}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0 pt-0.5">
                  <button
                    onClick={() => startEdit(plo)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: "var(--line)", color: "var(--ink-soft)", background: "#fff" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-pale)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-soft)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removePLO(plo.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: "var(--line)", color: "#b91c1c", background: "#fff" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add skill */}
      {adding ? (
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            background: "#fff",
            borderColor: "var(--rust)",
            boxShadow: "0 0 0 3px var(--rust-pale)",
          }}
        >
          <div className="text-xs font-semibold" style={{ color: "var(--rust)" }}>New skill</div>
          <input
            autoFocus
            placeholder="Short title"
            className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none"
            style={{
              borderColor: "var(--line)",
              background: "var(--bg)",
              fontFamily: "'Sora', sans-serif",
            }}
            value={newDraft.shortTitle ?? ""}
            onChange={(e) => setNewDraft((d) => ({ ...d, shortTitle: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && saveNew()}
          />
          <textarea
            placeholder="Plain-language description (optional)"
            rows={2}
            className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-y"
            style={{
              borderColor: "var(--line)",
              background: "var(--bg)",
              fontFamily: "'Sora', sans-serif",
            }}
            value={newDraft.paraphrase ?? ""}
            onChange={(e) => setNewDraft((d) => ({ ...d, paraphrase: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              onClick={saveNew}
              disabled={!newDraft.shortTitle?.trim()}
              className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
              style={{ background: "var(--rust)", color: "#fff" }}
            >
              Add skill
            </button>
            <button
              onClick={() => { setAdding(false); setNewDraft({}); }}
              className="text-sm px-4 py-2 rounded-lg border"
              style={{ borderColor: "var(--line)", color: "var(--text-2)", background: "#fff" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full text-sm py-3 rounded-xl border-2 border-dashed transition-all"
          style={{ borderColor: "var(--line)", color: "var(--text-2)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-soft)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--ink-pale)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
          }}
        >
          + Add skill
        </button>
      )}

      {/* Empty state */}
      {plos.length === 0 && (
        <div
          className="rounded-xl border-2 border-dashed p-10 text-center"
          style={{ borderColor: "var(--line)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-3)" }}>
            No skills yet. Upload a syllabus to extract them automatically.
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="pt-5 border-t flex items-center justify-between"
        style={{ borderColor: "var(--line-soft)" }}
      >
        <button
          onClick={() => setResearcherStep("upload")}
          className="text-sm px-4 py-2.5 rounded-lg border transition-colors"
          style={{ borderColor: "var(--line)", color: "var(--text-2)", background: "#fff" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          }}
        >
          ← Back to Upload
        </button>
        <button
          onClick={() => setResearcherStep("launch")}
          disabled={!canProceed}
          className="text-sm font-semibold px-6 py-2.5 rounded-xl disabled:opacity-40 transition-all"
          style={{
            background: canProceed ? "var(--ink)" : "var(--line)",
            color: canProceed ? "#fff" : "var(--text-2)",
            boxShadow: canProceed ? "0 2px 8px rgba(12,35,64,0.2)" : "none",
          }}
        >
          Proceed to Launch →
        </button>
      </div>
    </div>
  );
}
