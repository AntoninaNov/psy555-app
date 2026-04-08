# User Flow — PLO Perception Study

Study: *Cognitive Navigation in Academic Space* (Ящук, Новак)
App: `psy555-app` · Next.js 16

---

## Overview

```
Researcher  →  /           (setup, 4 steps)
Respondent  →  /respondent (study, 3 steps + intro/complete)
Results     →  /results    (read-only review + export)
```

---

## Actor 1 — Researcher

Entry point: `http://localhost:3000/`

Configures the concept pool before sharing the respondent link. Steps unlock in order.

### Step 1 · Upload (`upload`)
- Drag-and-drop or paste syllabus text (PDF / DOCX / TXT / plain paste)
- Multiple files supported
- **Output:** `session.syllabusFiles[]`

### Step 2 · Extract concepts (`extract`)
- `POST /api/extract` — Claude reads the syllabus and extracts 15–20 key concepts and theoretical constructs of the course
- Each concept gets a `shortTitle` (2–5 words, matching the course's own terminology) and a `paraphrase` (plain-language description a student would recognize)
- Target: concepts that appear across multiple lectures — not isolated facts, but structural nodes of the curriculum
- **Output:** `session.normalizedPLOs[]`

### Step 3 · Review concept pool (`review`)
- Edit any concept: title or description
- Add, delete, or reorder concepts
- Target range: **15–20 concepts** — fewer makes the map trivial, more exceeds working memory capacity
- **Output:** finalized `session.normalizedPLOs[]`

### Step 4 · Launch (`launch`)
- Session is marked active
- Researcher copies the respondent link: `{origin}/respondent`
- Shares link with study cohort (target: 15–20 respondents, ideally one study group)

---

## Actor 2 — Respondent

Entry point: `http://localhost:3000/respondent`

If no active session exists the page shows an error and prompts to contact the researcher. Progress bar visible throughout. No right or wrong answers.

Estimated total time: **~10–15 min**

---

### Step 0 · Intro (`intro`)
- Brief explanation of the study purpose (building a concept map of the course)
- Framing: "We want to understand how course concepts connect in your mind — not what you know, but how you see them as related"
- Reassurance: no grades, no right or wrong answers, anonymous, ~10–15 min
- CTA: "Start"

---

### Step 1 · Concept map — "How are these concepts connected?" (`node_selection` → repurposed as canvas entry)

> *Revised from original proposal — see rationale in Research Proposal §3.1*

**Full-screen canvas.** All 15–20 concept cards are placed on the canvas automatically, arranged in a grid. Respondent can freely reposition them.

**Primary task:** Rearrange the concepts however makes sense to you.
**No drag-from-pool mechanic** — all concepts are present from the start.

This removes the methodological problem of asking respondents to self-assess competence before mapping. Concepts with no connections at the end of Step 2 reveal isolation implicitly — without requiring respondents to declare ignorance upfront.

**Why this matters:**
The original "drag skills you know" mechanic conflated two distinct variables:
- Perceived self-competence (unreliable, Dunning-Kruger prone)
- Structural position in the knowledge network (what we actually want to measure)

By showing all concepts, we measure integration directly rather than through the filter of self-report.

**Output:**
```json
{ "nodes": [{ "id": "plo_id", "x": 120, "y": 340 }, ...] }
```
All nodes are present. Spatial position is preserved as secondary data.

CTA: "I've arranged the concepts — continue to draw connections"

---

### Step 2 · Edge creation & weighting — "How are they connected?" (`edge_creation`)

> *Proposal §3.2 — Edge creation + weighting — unchanged*

Same canvas, concepts already positioned.

- Respondent **draws lines between any two concepts** they see as related
- After drawing each line, a weight picker appears:
  - **1 — Weak link** (thin line) — "loosely related"
  - **2 — Moderate link** (medium line) — "clearly related"
  - **3 — Strong link** (thick line) — "very closely related"
- Lines are undirected
- A concept card with **no connections at all**, or with **only weight-1 connections**, is a "zombie concept" — present in the curriculum but not integrated into the student's knowledge network
- No cap on number of edges

**Output:**
```json
{
  "edges": [
    { "id": "e1", "source": "plo_a", "target": "plo_b", "weight": 3 },
    { "id": "e2", "source": "plo_a", "target": "plo_c", "weight": 1 },
    ...
  ]
}
```

Derived on save:
- `Average Edge Weight` = mean of all weights → H2 dependent variable
- `Edge Weight SD` = standard deviation of all weights → H3 dependent variable
- `Zombie concept count` = nodes with no edges OR all edges weight = 1 → H1 dependent variable
- `Edge Count` = total connections drawn → descriptive

CTA: "Done connecting — continue"

---

### Step 3 · Metadata — Academic performance (`metadata`)

> *Proposal §3.3 — unchanged*

Single-question screen.

- **"What is your current GPA?"** — numeric input, validated (60–100 or 1–5 depending on scale)
- Short note: "Used only for anonymous statistical analysis"

**Output:** `respondentData.gpa: number`

GPA is the correlate variable for H1, H2, and H3.

CTA: "Submit"

---

### Step 4 · Complete (`complete`)
- Thank-you screen
- `respondentData.completedAt` timestamp written
- Summary of respondent's map shown (node count, edge count, avg weight)
- "You may close this tab"

---

## Results Page — `/results`

Access: researcher only; requires `respondentData.completedAt`.

### Per-respondent metrics

| Metric | Formula | Hypothesis |
|---|---|---|
| Node Count | count of concept cards (always = pool size, since all shown) | descriptive / control |
| Edge Count | count of drawn connections | descriptive |
| Average Edge Weight | mean of all edge weights | H2 (dependent var) |
| Edge Weight SD | standard deviation of all edge weights | H3 (dependent var) |
| Zombie Concept Count | nodes with no edges or all edges weight=1 | H1 (dependent var) |
| GPA | entered by respondent | H1, H2, H3 (correlate) |

> **Note on Node Count:** Because all concepts are now placed by default, Node Count is no longer an independent variable (it is constant = pool size). The meaningful structural variable is now **Edge Count** (how many connections the student drew at all) and **Zombie Concept Count** (how many concepts were left isolated).

### Hypothesis checks (computed across all respondents)

| Hypothesis | Measurement | Expected direction |
|---|---|---|
| **H1** — GPA correlates with knowledge fragmentation | `CORREL(GPA, ZombieConceptCount)` | positive (higher GPA → more isolated concepts) |
| **H1b** — GPA correlates with avg connection strength | `CORREL(GPA, AvgEdgeWeight)` | weak / negative |
| **H2** — Connection density vs. average weight | `CORREL(EdgeCount, AvgEdgeWeight)` | negative (more connections → weaker on average) |
| **H3** — GPA correlates with flat knowledge maps | `CORREL(GPA, EdgeWeightSD)` | negative (higher GPA → less differentiated map) |

### Export
- **JSON** — full adjacency list per respondent for network analysis tools
- **CSV** — one row per respondent: `respondentId, gpa, edgeCount, avgEdgeWeight, edgeWeightSD, zombieConceptCount`

---

## Data model

```
StudySession
├── normalizedPLOs[]        concept pool (15–20 items, researcher-curated)
└── respondentData
    ├── gpa: number
    ├── nodes[]              all concepts + canvas positions (respondent-arranged)
    │   └── { id, x, y }
    ├── edges[]              weighted connections
    │   └── { id, source, target, weight: 1|2|3 }
    ├── startedAt: string
    ├── completedAt: string
    └── timestamps[]         per-step entry times
```

---

## Recommended concept pool for this course

Based on the syllabus of *Поведінка та психологія тварин: еволюційні основи соціальної поведінки* (Danylov, 2025/2026), the following 18 concepts span all 3 modules and are structurally central:

| # | shortTitle | Module |
|---|---|---|
| 1 | Natural Selection | 1 |
| 2 | Tinbergen's Four Questions | 1 |
| 3 | Fixed Action Patterns | 1 |
| 4 | Imprinting & Critical Periods | 1 |
| 5 | Evolutionary Mismatch | 1 |
| 6 | Theory of Mind | 1 |
| 7 | Dominance Hierarchies | 2 |
| 8 | Ritualized Aggression | 2 |
| 9 | Kin Selection (Hamilton's Rule) | 2 |
| 10 | Reciprocal Altruism | 2 |
| 11 | Territoriality & Proxemics | 2 |
| 12 | Sexual Selection | 2 |
| 13 | Honest Signalling | 2 |
| 14 | Parental Investment | 2 |
| 15 | Animal Communication | 3 |
| 16 | Social Learning | 3 |
| 17 | Personality & Psychopathology | 3 |
| 18 | Play & Ritual | 3 |
