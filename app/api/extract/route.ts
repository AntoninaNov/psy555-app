import type { NextRequest } from "next/server";
import { PLO } from "@/lib/types";
import { extractOutcomesFromText, normalizeOutcomes } from "@/lib/extraction";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

interface SyllabusInput {
  name: string;
  rawText: string;
}

/**
 * Attempts to repair a truncated JSON response from Gemini.
 * If the model hit a token limit mid-stream, we recover all complete PLO entries.
 */
/** Strip markdown code fences that Gemini sometimes wraps around JSON */
function stripMarkdown(text: string): string {
  // Complete fence: ```json ... ```
  const complete = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (complete) return complete[1].trim();
  // Truncated fence: starts with ```json but closing ``` was never written
  const open = text.match(/^```(?:json)?\s*([\s\S]*)/);
  if (open) return open[1].trim();
  return text.trim();
}

function repairJson(text: string): string {
  // Happy path
  try { JSON.parse(text); return text; } catch {}

  // Find the last fully-closed PLO object inside the array
  // A complete entry ends with `}` followed by optional whitespace then `,` or `]`
  const candidates = [
    // last entry before a comma (middle of array)
    text.lastIndexOf("},"),
    // last entry that closes the array
    text.lastIndexOf("}]"),
  ].filter((i) => i > 0);

  const cutPoint = candidates.length ? Math.max(...candidates) + 1 : -1;

  if (cutPoint > 0) {
    const repaired = text.slice(0, cutPoint) + "\n  ]\n}";
    try { JSON.parse(repaired); return repaired; } catch {}
  }

  // Last resort: close after the last `}` we can find
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace > 0) {
    const repaired = text.slice(0, lastBrace + 1) + "\n  ]\n}";
    try { JSON.parse(repaired); return repaired; } catch {}
  }

  throw new Error("Cannot repair truncated JSON");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let syllabusFiles: SyllabusInput[];
  try {
    ({ syllabusFiles } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(syllabusFiles) || syllabusFiles.length === 0) {
    return Response.json({ error: "syllabusFiles must be a non-empty array" }, { status: 400 });
  }

  // Build a combined prompt — truncate each file to keep total payload manageable
  const MAX_CHARS_PER_FILE = 15_000;
  const syllabusContent = syllabusFiles
    .map(
      (f) =>
        `=== SYLLABUS: ${f.name} ===\n${f.rawText.slice(0, MAX_CHARS_PER_FILE)}`
    )
    .join("\n\n");

  const prompt = `Роль: Ти — методолог вищої освіти та психометрик, що розробляє стимульний матеріал для дослідження когнітивних карт навчальних програм.

Контекст: Результат твоєї роботи — фінальний список PLO-вузлів для концептуальної карти, яку будуватимуть студенти. Кожна картка = один вузол. Студент бачить лише shortTitle і paraphrase — і на їх основі вирішує, як вузли пов'язані між собою. Якість формулювань прямо впливає на валідність дослідження.

════ ГОЛОВНИЙ ПРИНЦИП: ВУЗОЛ МАЄ БУТИ ЗДАТНИМ ДО З'ЄДНАННЯ ════

Перед кожним вузлом запитай: «Чи може студент провести осмислений зв'язок між цим вузлом і щонайменше 2–3 іншими у цьому ж наборі?»

Вузол НЕПРИДАТНИЙ, якщо:
- З'єднується лише з 1 іншим (занадто специфічний)
- Тривіально з'єднується з усім (занадто широкий)
- Є ізольованим «островом» — не взаємодіє з рештою програми
- Сформульований як адміністративна категорія («Знання основ X»)

Вузол ЯКІСНИЙ, якщо:
- Між ним і 3–5 іншими вузлами існують реальні, неочевидні зв'язки
- Видно, як він «живить» або «застосовується разом з» іншими компетентностями
- Різні студенти можуть по-різному з'єднати його з іншими (когнітивна варіативність)

════ ПРАВИЛА ФОРМУЛЮВАННЯ ════

Тип «Навичка» — комплексна професійна дія мезорівня:
• Починай з дієслівного іменника: Проведення, Розробка, Диференціація, Інтерпретація, Застосування...
• Агрегуй мікро-навички в одну комплексну дію (SPSS + дисперсія → «Розрахунок та інтерпретація статистичних критеріїв»)
• Якщо базова навичка — лише інструмент для складнішої, лишай тільки складнішу

Тип «Знання» — фундаментальний теоретичний конструкт або пояснювальна рамка:
• Називай сам конструкт, не факт («Нозологічні системи та моделі патогенезу», а не «знання симптомів»)
• Агрегуй окремі факти у великі пояснювальні рамки або парадигми

════ КІЛЬКІСТЬ ВУЗЛІВ ════

Витягни СТІЛЬКИ вузлів, скільки реально існує різних мезорівневих елементів компетентності в програмі. НЕ обмежуй штучно. Повна програма (10–20 силабусів) → 20–35 вузлів є нормою.
- Якщо два вузли перетинаються на 70%+ → злий їх
- Якщо вузол охоплює 3–4 різні дії → розбий на окремі
- В усіх інших випадках → зберігай кожен distinct елемент окремо

════════════════════════════════════════
ТЕКСТ СИЛАБУСУ(ІВ)
════════════════════════════════════════

${syllabusContent}

════════════════════════════════════════
ФОРМАТ ВИВОДУ (лише JSON, без markdown)
════════════════════════════════════════

{
  "plos": [
    {
      "id": "plo-1",
      "shortTitle": "Повне мезорівневе формулювання — конкретне, активне. Це мітка вузла на карті.",
      "paraphrase": "2–3 речення від 2-ї особи: що саме ти вмієш робити, коли це застосовується і чому це важливо у професії"
    }
  ]
}

Вимоги до полів:
• shortTitle: не скорочуй — хай буде стільки слів, скільки потрібно для точності. Уникай «розуміння», «знання», «основи».
• paraphrase: конкретна, впізнавана — студент має впізнати власний досвід навчання.`;

  let geminiResult: { plos: PLO[] } | null = null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
          maxOutputTokens: 32768,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      throw new Error(`Gemini returned ${res.status}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const rawText: string | undefined =
      candidate?.content?.parts?.[0]?.text;

    if (finishReason && finishReason !== "STOP") {
      console.warn("Gemini finishReason:", finishReason, "— response may be truncated");
    }

    if (!rawText) {
      throw new Error("Empty response from Gemini");
    }

    const parsed = JSON.parse(repairJson(stripMarkdown(rawText)));

    if (!Array.isArray(parsed.plos)) {
      throw new Error("Unexpected Gemini response shape");
    }

    // Normalise: add sourceIds if missing (single-step extraction has no raw outcomes)
    const plos: PLO[] = parsed.plos.map((p: Partial<PLO>, i: number) => ({
      id: p.id ?? `plo-${i + 1}`,
      shortTitle: p.shortTitle ?? "",
      original: p.original ?? "",
      paraphrase: p.paraphrase ?? "",
      sourceIds: p.sourceIds ?? [],
    }));

    geminiResult = { plos };
  } catch (err) {
    console.error("Gemini extraction failed, falling back to regex:", err);
  }

  // Fallback: regex-based extraction if Gemini failed
  if (!geminiResult) {
    const allOutcomes = syllabusFiles.flatMap((f) =>
      extractOutcomesFromText(f.rawText, f.name)
    );
    const plos = normalizeOutcomes(allOutcomes);
    return Response.json({ plos });
  }

  return Response.json(geminiResult);
}
