"use client";
import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { nanoid } from "@/lib/nanoid";
import { SyllabusFile } from "@/lib/types";
import { extractTextFromDocx, extractTextFromPdf } from "@/lib/extraction";
import { SAMPLE_SYLLABUS_FILE, SAMPLE_PLOS } from "@/lib/mockData";

export function UploadPanel() {
  const {
    session,
    addSyllabusFile,
    removeSyllabusFile,
    setNormalizedPLOs,
    setResearcherStep,
    setIsExtracting,
    isExtracting,
  } = useAppStore();

  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [dragOver,  setDragOver]  = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const files = session?.syllabusFiles ?? [];

  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rawText = "";
    if (ext === "txt") {
      rawText = await file.text();
    } else if (ext === "docx") {
      rawText = await extractTextFromDocx(await file.arrayBuffer());
    } else if (ext === "pdf") {
      rawText = await extractTextFromPdf(await file.arrayBuffer());
    } else {
      rawText = await file.text();
    }
    const sf: SyllabusFile = {
      id: nanoid(),
      name: file.name,
      type: (ext === "pdf" || ext === "docx" || ext === "txt") ? ext : "txt",
      rawText,
      uploadedAt: new Date().toISOString(),
    };
    addSyllabusFile(sf);
  }

  async function handleFiles(list: FileList) {
    for (const f of Array.from(list)) await processFile(f);
  }

  function handlePaste() {
    if (!pasteText.trim()) return;
    addSyllabusFile({
      id: nanoid(),
      name: pasteName.trim() || "Pasted text",
      type: "paste",
      rawText: pasteText,
      uploadedAt: new Date().toISOString(),
    });
    setPasteText("");
    setPasteName("");
    setPasteOpen(false);
  }

  function loadDemo() {
    addSyllabusFile(SAMPLE_SYLLABUS_FILE);
    setNormalizedPLOs(SAMPLE_PLOS);
    setResearcherStep("review");
  }

  async function extractAll() {
    setIsExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusFiles: files.map((f) => ({ name: f.name, rawText: f.rawText })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { plos } = await res.json();
      setNormalizedPLOs(plos);
      setResearcherStep("extract");
    } catch (err) {
      console.error("Extraction failed:", err);
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        className="relative border-2 border-dashed rounded-2xl transition-all cursor-pointer"
        style={{
          borderColor: dragOver ? "var(--rust)" : "var(--line)",
          background:  dragOver ? "var(--rust-pale)" : "var(--bg)",
          padding: "48px 24px",
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
            style={{
              background: dragOver ? "var(--rust)" : "var(--ink-pale)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v13M5 10l7-7 7 7M4 19h16"
                stroke={dragOver ? "#fff" : "var(--ink)"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display font-semibold text-lg" style={{ color: "var(--ink)" }}>
              Drop syllabus files here
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
              PDF, DOCX, or TXT &nbsp;·&nbsp; multiple files supported
            </p>
          </div>
          <span
            className="text-xs font-medium px-3.5 py-1.5 rounded-full"
            style={{ background: dragOver ? "rgba(200,75,28,0.15)" : "var(--ink-pale)", color: dragOver ? "var(--rust)" : "var(--ink)" }}
          >
            or click to browse files
          </span>
        </div>
      </div>

      {/* Paste text toggle */}
      <div>
        <button
          onClick={() => setPasteOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--ink-soft)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif", padding: 0 }}
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transition: "transform 0.2s", transform: pasteOpen ? "rotate(90deg)" : "none" }}
          >
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Or paste syllabus text
        </button>

        {pasteOpen && (
          <div
            className="mt-3 rounded-xl border p-5 space-y-3 anim-up"
            style={{ background: "#fff", borderColor: "var(--line)" }}
          >
            <input
              type="text"
              placeholder="Optional label (e.g. Psychology III)"
              value={pasteName}
              onChange={(e) => setPasteName(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none"
              style={{
                borderColor: "var(--line)",
                background: "var(--bg)",
                fontFamily: "'Sora', sans-serif",
              }}
            />
            <textarea
              placeholder="Paste syllabus text here…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              className="w-full text-sm border rounded-lg px-3 py-2.5 outline-none resize-y"
              style={{
                borderColor: "var(--line)",
                background: "var(--bg)",
                fontFamily: "'Sora', sans-serif",
              }}
            />
            <button
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-40"
              style={{ background: "var(--ink)", color: "#fff", fontFamily: "'Sora', sans-serif" }}
            >
              Add text
            </button>
          </div>
        )}
      </div>

      {/* Loaded files */}
      {files.length > 0 && (
        <div
          className="rounded-xl border divide-y overflow-hidden"
          style={{ borderColor: "var(--line)" }}
        >
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: "#fff" }}
            >
              <span
                className="text-[10px] font-mono-custom font-semibold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                style={{ background: "var(--ink-pale)", color: "var(--ink)" }}
              >
                {f.type}
              </span>
              <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>
                {f.name}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>
                {Math.round(f.rawText.length / 1000)}k chars
              </span>
              <button
                onClick={() => removeSyllabusFile(f.id)}
                className="text-xs px-2 py-1 rounded border transition-colors flex-shrink-0"
                style={{ borderColor: "var(--line)", color: "#b91c1c", background: "#fff" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Extract CTA */}
      {files.length > 0 && (
        <button
          onClick={extractAll}
          disabled={isExtracting}
          className="w-full text-sm font-semibold py-4 rounded-xl transition-all disabled:opacity-60"
          style={{
            background: isExtracting ? "var(--line)" : "var(--ink)",
            color: isExtracting ? "var(--text-2)" : "#fff",
            boxShadow: isExtracting ? "none" : "0 2px 12px rgba(12,35,64,0.22)",
          }}
        >
          {isExtracting
            ? "Extracting skills with AI…"
            : `Extract skills from ${files.length} file${files.length !== 1 ? "s" : ""} →`}
        </button>
      )}

      {/* Demo shortcut */}
      <div className="pt-1 border-t" style={{ borderColor: "var(--line-soft)" }}>
        <button
          onClick={loadDemo}
          className="w-full text-sm py-3 rounded-xl border transition-all"
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
          Load demo dataset (CS program, 20 skills)
        </button>
      </div>
    </div>
  );
}
