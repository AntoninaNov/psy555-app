import type { NextRequest } from "next/server";
import type { RespondentData } from "@/lib/types";

// ─── KV abstraction — works with Vercel KV env vars ────────────────────────
// Vercel KV exposes a Redis-compatible REST API via these env vars:
//   KV_REST_API_URL  and  KV_REST_API_TOKEN
//
// If those vars are absent the endpoints gracefully return empty data.

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const LIST_KEY = "psy555:sessions";

async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.result) return null;
  const once = JSON.parse(json.result);
  return (typeof once === "string" ? JSON.parse(once) : once) as T;
}

async function kvSet(key: string, value: unknown): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(JSON.stringify(value)), // KV stores strings
  });
  return res.ok;
}

async function kvDel(key: string): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  const res = await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  return res.ok;
}

async function getAllSessionIds(): Promise<string[]> {
  const list = await kvGet<string[]>(LIST_KEY);
  return list ?? [];
}

async function saveSessionIds(ids: string[]): Promise<void> {
  await kvSet(LIST_KEY, ids);
}

// ─── GET /api/sessions — return all stored respondent sessions ──────────────
export async function GET() {
  try {
    const ids = await getAllSessionIds();
    const sessions = (
      await Promise.all(ids.map((id) => kvGet<RespondentData>(`psy555:session:${id}`)))
    ).filter((s): s is RespondentData => s !== null);

    return Response.json({
      sessions,
      kvConfigured: !!(KV_URL && KV_TOKEN),
    });
  } catch (err) {
    console.error("GET /api/sessions error:", err);
    return Response.json({ sessions: [], kvConfigured: false, error: "Storage error" });
  }
}

// ─── POST /api/sessions — store a completed respondent session ──────────────
export async function POST(req: NextRequest) {
  let data: RespondentData;
  try {
    data = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!data?.id || !data?.completedAt) {
    return Response.json({ error: "Missing required fields: id, completedAt" }, { status: 400 });
  }

  if (!KV_URL || !KV_TOKEN) {
    return Response.json({ ok: false, reason: "KV not configured — data saved to client only" }, { status: 200 });
  }

  try {
    // Store the session data
    await kvSet(`psy555:session:${data.id}`, data);

    // Update the index (deduplicate)
    const ids = await getAllSessionIds();
    if (!ids.includes(data.id)) {
      await saveSessionIds([...ids, data.id]);
    }

    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("POST /api/sessions error:", err);
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}

// ─── DELETE /api/sessions?id=<respondentId> — remove a single session ───────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing ?id param" }, { status: 400 });

  if (!KV_URL || !KV_TOKEN) {
    return Response.json({ ok: false, reason: "KV not configured" }, { status: 200 });
  }

  try {
    await kvDel(`psy555:session:${id}`);
    const ids = (await getAllSessionIds()).filter((s) => s !== id);
    await saveSessionIds(ids);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/sessions error:", err);
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}
