import { PLO } from "./types";

// Internal type — not exported from types.ts (only used in fallback extraction)
interface RawOutcome {
  id: string;
  text: string;
  source: string;
  section: string;
}

// ─── Section Header Keywords ──────────────────────────────────────────────────
// Scans for sections likely to contain learning outcomes

const SECTION_KEYWORDS = [
  "learning outcome",
  "course outcome",
  "program outcome",
  "programme outcome",
  "student outcome",
  "learning result",
  "result of learning",
  "graduate attribute",
  "competenc",
  "objective",
  "upon completion",
  "by the end of",
  "students will be able",
  "graduates will",
  "you will be able",
];

const BULLET_PATTERNS = [
  /^\s*(\d+[\.\)]\s+)/,    // 1. or 1)
  /^\s*([a-z][\.\)]\s+)/i, // a. or a)
  /^\s*([-•·▪▸→]\s+)/,     // bullet chars
  /^\s*(\*\s+)/,           // markdown bullet
];

// ─── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Extract raw learning outcome strings from plain text.
 * Strategy: find sections with heading keywords, then extract bullet/numbered items.
 */
export function extractOutcomesFromText(
  text: string,
  sourceName: string
): RawOutcome[] {
  const lines = text.split(/\r?\n/);
  const outcomes: RawOutcome[] = [];
  let insideSection = false;
  let currentSection = "";
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section headings
    const lowerLine = trimmed.toLowerCase();
    const isSectionHeader = SECTION_KEYWORDS.some((kw) =>
      lowerLine.includes(kw)
    );

    if (isSectionHeader && trimmed.length < 120) {
      // Treat as a section heading if it's short
      insideSection = true;
      currentSection = trimmed;
      continue;
    }

    // If we're inside a known section, capture bullet/numbered items
    if (insideSection) {
      const isBullet = BULLET_PATTERNS.some((p) => p.test(line));
      const isNumbered = /^\s*\d+[\.\)]/.test(line);

      if (isBullet || isNumbered) {
        const cleaned = trimmed
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[a-z][\.\)]\s*/i, "")
          .replace(/^[-•·▪▸→\*]\s*/, "")
          .trim();

        if (cleaned.length > 15 && cleaned.length < 500) {
          idCounter++;
          outcomes.push({
            id: `${sourceName.slice(0, 8).replace(/\s/g, "")}-${idCounter}`,
            text: cleaned,
            source: sourceName,
            section: currentSection,
          });
        }
      } else if (trimmed.length > 15 && trimmed.length < 500 && insideSection) {
        // Prose lines inside a section can also be outcomes (less reliable)
        // Only include if they look like skill statements
        const skillIndicators = [
          "apply", "analyze", "design", "implement", "evaluate",
          "demonstrate", "understand", "communicate", "develop",
          "create", "use", "work", "identify", "explain",
        ];
        const lowerTrimmed = trimmed.toLowerCase();
        if (skillIndicators.some((w) => lowerTrimmed.startsWith(w))) {
          idCounter++;
          outcomes.push({
            id: `${sourceName.slice(0, 8).replace(/\s/g, "")}-${idCounter}`,
            text: trimmed,
            source: sourceName,
            section: currentSection,
          });
        }
      }

      // Detect end of section (blank line followed by a new heading or 3+ blanks)
      const nextFewBlanks = lines
        .slice(i + 1, i + 4)
        .every((l) => !l.trim());
      if (nextFewBlanks) {
        insideSection = false;
      }
    }
  }

  // Fallback: if nothing found, try a global scan for any numbered/bulleted items
  // that contain skill verbs
  if (outcomes.length === 0) {
    const skillVerbs = [
      "apply", "analyze", "analyse", "design", "implement", "evaluate",
      "demonstrate", "understand", "communicate", "develop", "create",
      "use", "identify", "explain", "assess", "compare", "construct",
      "formulate", "plan", "describe", "perform",
    ];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.length < 15 || trimmed.length > 400) continue;
      const isBullet = BULLET_PATTERNS.some((p) => p.test(lines[i]));
      const lowerTrimmed = trimmed.toLowerCase();
      if (
        isBullet &&
        skillVerbs.some((v) => lowerTrimmed.includes(v))
      ) {
        const cleaned = trimmed
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[a-z][\.\)]\s*/i, "")
          .replace(/^[-•·▪▸→\*]\s*/, "")
          .trim();
        idCounter++;
        outcomes.push({
          id: `fallback-${idCounter}`,
          text: cleaned,
          source: sourceName,
          section: "Detected outcomes",
        });
      }
    }
  }

  return outcomes;
}

// ─── Thematic Domain Clusters ────────────────────────────────────────────────
// Each cluster represents a broad program-level domain. Outcomes are scored
// against these clusters and one representative PLO is produced per domain.
// This ensures the final 8–10 PLOs span the whole program rather than
// over-representing whichever courses had the most redundant outcomes.

const DOMAIN_CLUSTERS: Array<{
  title: string;
  paraphrase: string;
  keywords: string[];
}> = [
  {
    title: "Computational Problem Solving",
    paraphrase: "You can break down complex problems and design algorithmic solutions.",
    keywords: ["algorithm", "problem", "solving", "decompose", "computational", "complexity",
               "data structure", "sort", "search", "recursion", "logic", "proof", "induction",
               "big-o", "efficiency", "correctness"],
  },
  {
    title: "Software Design & Implementation",
    paraphrase: "You can design, build, and test working software using appropriate paradigms.",
    keywords: ["implement", "program", "code", "develop", "software", "language", "paradigm",
               "functional", "object", "debug", "class", "module", "abstraction", "interface",
               "inheritance", "pattern", "refactor", "test", "unit"],
  },
  {
    title: "Software Engineering Practice",
    paraphrase: "You can apply professional software engineering methods throughout the development lifecycle.",
    keywords: ["engineering", "requirement", "lifecycle", "agile", "scrum", "methodology",
               "version control", "git", "documentation", "review", "sprint", "project",
               "planning", "integration", "deployment", "ci", "quality assurance"],
  },
  {
    title: "Data & Database Systems",
    paraphrase: "You can design databases and use queries to store and retrieve data effectively.",
    keywords: ["database", "data", "query", "sql", "relational", "schema", "model",
               "normalize", "storage", "retrieval", "nosql", "transaction", "index",
               "entity", "table", "join"],
  },
  {
    title: "Systems & Infrastructure",
    paraphrase: "You can work with operating systems, networks, and distributed computing fundamentals.",
    keywords: ["operating system", "network", "process", "memory", "thread", "concurrent",
               "distributed", "server", "protocol", "socket", "cloud", "virtualization",
               "linux", "kernel", "file system", "tcp", "http"],
  },
  {
    title: "Mathematical & Theoretical Foundations",
    paraphrase: "You can apply mathematical reasoning — logic, probability, and algebra — to computing problems.",
    keywords: ["math", "calculus", "algebra", "discrete", "probability", "statistic",
               "proof", "logic", "theorem", "set theory", "graph theory", "matrix",
               "function", "relation", "formal", "combinatorics"],
  },
  {
    title: "Architecture & System Design",
    paraphrase: "You can design and evaluate system architectures and apply appropriate design patterns.",
    keywords: ["architecture", "design pattern", "architectural", "microservice", "component",
               "layer", "scalab", "modular", "coupling", "cohesion", "api", "rest",
               "service", "facade", "mvc", "repository"],
  },
  {
    title: "Communication & Collaboration",
    paraphrase: "You can communicate technical ideas clearly and work effectively in teams.",
    keywords: ["communicat", "team", "collaborat", "present", "write", "document",
               "professional", "audience", "report", "oral", "written", "stakeholder",
               "non-technical", "peer", "interpersonal"],
  },
  {
    title: "Ethics, Security & Social Impact",
    paraphrase: "You can reason about the ethical, security, and societal implications of computing.",
    keywords: ["ethic", "social", "impact", "responsib", "legal", "security", "privacy",
               "cyber", "vulnerability", "integrity", "culture", "bias", "inclusion",
               "sustainable", "policy"],
  },
  {
    title: "Analysis, Research & Critical Thinking",
    paraphrase: "You can critically evaluate evidence, conduct research, and apply analytical reasoning.",
    keywords: ["research", "critical", "evaluat", "assess", "reflect", "analys", "evidence",
               "investigat", "compare", "justify", "interpret", "synthesise", "synthesize",
               "literature", "methodology", "experiment"],
  },
];

// ─── Normalization & Deduplication ────────────────────────────────────────────

/**
 * Normalize extracted outcomes into respondent-facing PLOs using thematic clustering.
 *
 * Strategy:
 * 1. Deduplicate near-identical outcomes.
 * 2. Score every outcome against each domain cluster (keyword overlap).
 * 3. Assign each outcome to its best-matching domain.
 * 4. For each non-empty domain, pick the best representative outcome AND
 *    collect all source outcomes under it — so one PLO represents many courses.
 * 5. If a domain has no outcomes, skip it. If domains < 4, fall back to
 *    similarity-based merging to reach a minimum viable count.
 * 6. Enforce 8–10 cap by dropping the smallest clusters.
 *
 * This ensures the final PLOs span the whole program breadth.
 */
export function normalizeOutcomes(rawOutcomes: RawOutcome[]): PLO[] {
  if (rawOutcomes.length === 0) return [];

  // Step 1: Remove exact duplicates
  const seen = new Set<string>();
  const unique = rawOutcomes.filter((o) => {
    const key = o.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Step 2: Remove near-duplicates per source first (>80% word overlap within same file)
  // This prevents one verbose course from dominating
  const deduplicatedPerSource: RawOutcome[] = [];
  const seenPerSource = new Map<string, string[]>(); // source → texts already kept
  for (const candidate of unique) {
    const sourceTexts = seenPerSource.get(candidate.source) ?? [];
    const isDuplicate = sourceTexts.some(
      (t) => wordOverlap(t, candidate.text) > 0.8
    );
    if (!isDuplicate) {
      sourceTexts.push(candidate.text);
      seenPerSource.set(candidate.source, sourceTexts);
      deduplicatedPerSource.push(candidate);
    }
  }

  // Step 3: Assign each outcome to a domain cluster
  type ClusterBucket = { domain: typeof DOMAIN_CLUSTERS[0]; outcomes: RawOutcome[]; bestScore: number };
  const buckets: ClusterBucket[] = DOMAIN_CLUSTERS.map((d) => ({
    domain: d,
    outcomes: [],
    bestScore: 0,
  }));

  for (const outcome of deduplicatedPerSource) {
    let bestBucket = -1;
    let bestScore = 0;
    for (let i = 0; i < DOMAIN_CLUSTERS.length; i++) {
      const score = domainScore(outcome.text, DOMAIN_CLUSTERS[i].keywords);
      if (score > bestScore) {
        bestScore = score;
        bestBucket = i;
      }
    }
    // If nothing matched at all, assign to the closest by word overlap with domain title
    if (bestBucket === -1) {
      bestBucket = 0;
      for (let i = 0; i < DOMAIN_CLUSTERS.length; i++) {
        const s = wordOverlap(outcome.text, DOMAIN_CLUSTERS[i].title);
        if (s > bestScore) { bestScore = s; bestBucket = i; }
      }
    }
    if (bestBucket >= 0) {
      buckets[bestBucket].outcomes.push(outcome);
      if (bestScore > buckets[bestBucket].bestScore) {
        buckets[bestBucket].bestScore = bestScore;
      }
    }
  }

  // Step 4: Build one PLO per non-empty bucket, using domain title/paraphrase as defaults
  let populated = buckets.filter((b) => b.outcomes.length > 0);

  // Step 5: If we have fewer than 4 distinct domains, fall back to similarity merging
  // to produce at least 4 PLOs
  if (populated.length < 4) {
    return fallbackSimilarityNormalize(deduplicatedPerSource);
  }

  // Step 6: Sort by number of outcomes descending, keep top 10
  populated.sort((a, b) => b.outcomes.length - a.outcomes.length);
  if (populated.length > 10) populated = populated.slice(0, 10);

  // Step 7: Convert to PLOs
  // For the representative text, pick the outcome with the highest domain score
  return populated.map((bucket, i) => {
    const sorted = [...bucket.outcomes].sort(
      (a, b) =>
        domainScore(b.text, bucket.domain.keywords) -
        domainScore(a.text, bucket.domain.keywords)
    );
    const best = sorted[0];
    const sources = [...new Set(bucket.outcomes.map((o) => o.source))];
    return {
      id: `plo-${i + 1}`,
      shortTitle: bucket.domain.title,
      original: sorted.slice(0, 3).map((o) => o.text).join(" | "),
      paraphrase: bucket.domain.paraphrase,
      sourceIds: bucket.outcomes.map((o) => o.id),
    };
  });
}

/** Score an outcome text against a domain's keyword list */
function domainScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score += 1;
  }
  return score / keywords.length;
}

/**
 * Fallback: when domain clustering yields too few clusters (e.g. single-file upload),
 * fall back to iterative similarity merging to produce 4–10 PLOs.
 */
function fallbackSimilarityNormalize(outcomes: RawOutcome[]): PLO[] {
  let working = outcomes.map((r) => ({ outcomes: [r], merged: r.text }));

  while (working.length > 10) {
    let bestScore = -1, bestI = 0, bestJ = 1;
    for (let i = 0; i < working.length - 1; i++) {
      for (let j = i + 1; j < working.length; j++) {
        const score = wordOverlap(working[i].merged, working[j].merged);
        if (score > bestScore) { bestScore = score; bestI = i; bestJ = j; }
      }
    }
    const merged = {
      outcomes: [...working[bestI].outcomes, ...working[bestJ].outcomes],
      merged: working[bestI].merged + " / " + working[bestJ].merged,
    };
    working = working.filter((_, idx) => idx !== bestI && idx !== bestJ);
    working.push(merged);
  }

  return working.map((w, i) => {
    const primary = w.outcomes[0];
    return {
      id: `plo-${i + 1}`,
      shortTitle: generateShortTitle(primary.text),
      original: w.outcomes.map((o) => o.text).join(" | "),
      paraphrase: generateParaphrase(primary.text),
      sourceIds: w.outcomes.map((o) => o.id),
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  );
  const wordsB = new Set(
    b.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  );
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

/** Extract a short title from an outcome by taking the first meaningful verb phrase */
function generateShortTitle(text: string): string {
  // Try to extract "Verb + Object" pattern from the start
  const titleVerbs = [
    "Apply", "Analyze", "Analyse", "Design", "Implement", "Evaluate",
    "Demonstrate", "Understand", "Communicate", "Develop", "Create",
    "Use", "Identify", "Explain", "Assess", "Compare", "Construct",
    "Formulate", "Plan", "Describe", "Perform", "Work",
  ];

  const clean = text.trim();
  const firstWord = clean.split(/\s+/)[0];
  const capitalizedFirst =
    firstWord.charAt(0).toUpperCase() + firstWord.slice(1);

  // Take first 5–7 words as title
  const words = clean.split(/\s+/);
  const titleWords = words.slice(0, 5).join(" ").replace(/[,:;]$/, "");

  if (
    titleVerbs.some((v) => v.toLowerCase() === firstWord.toLowerCase()) &&
    titleWords.length < 50
  ) {
    return titleWords;
  }

  // Fallback: truncate to 40 chars
  return clean.length > 45 ? clean.slice(0, 42) + "…" : clean;
}

/** Generate a plain-language paraphrase */
function generateParaphrase(text: string): string {
  // Simple transformation: lowercase first word if it's a Bloom's verb,
  // add "You can..." prefix for student-friendliness
  const clean = text.trim();
  const lower = clean.charAt(0).toLowerCase() + clean.slice(1);
  // Remove trailing period if present
  const stripped = lower.replace(/\.$/, "");
  return `You can ${stripped}.`;
}

// ─── DOCX Extraction ─────────────────────────────────────────────────────────

/**
 * Extract text from a DOCX ArrayBuffer using mammoth.
 * Returns plain text string.
 */
export async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  } catch (e) {
    console.error("DOCX extraction failed", e);
    return "";
  }
}

/**
 * Extract text from a PDF using the PDF.js text layer.
 * Basic implementation — for production use a dedicated PDF service.
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (e) {
    console.error("PDF extraction failed", e);
    return "";
  }
}
