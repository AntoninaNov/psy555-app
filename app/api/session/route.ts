import type { NextRequest } from "next/server";
import type { PLO } from "@/lib/types";

// ─── Active session stored in KV under a single well-known key ────────────────
// When the researcher clicks "Copy link", we POST here with the PLOs.
// When a respondent loads /respondent on a fresh device (empty localStorage),
// they GET here to hydrate their store with the launched session.

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const ACTIVE_KEY = "psy555:active-session";

interface ActiveSession {
  sessionId: string;
  plos: PLO[];
  launched: boolean;
  launchedAt: string;
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.result) return null;
  // kvSet stores JSON.stringify(JSON.stringify(value)), so the first parse yields
  // a string; the second parse yields the actual object.
  const once = JSON.parse(json.result);
  return (typeof once === "string" ? JSON.parse(once) : once) as T;
}

async function kvSet(key: string, value: unknown): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(JSON.stringify(value)),
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

// ─── GET /api/session ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await kvGet<ActiveSession>(ACTIVE_KEY);
    if (!session) return Response.json({ launched: false, plos: [] });
    return Response.json(session);
  } catch (err) {
    console.error("GET /api/session error:", err);
    return Response.json({ launched: false, plos: [] });
  }
}

// ─── POST /api/session — researcher publishes the active session ───────────────
export async function POST(req: NextRequest) {
  let body: { sessionId: string; plos: PLO[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.sessionId || !Array.isArray(body?.plos) || body.plos.length === 0) {
    return Response.json({ error: "Missing required fields: sessionId, plos" }, { status: 400 });
  }

  if (!KV_URL || !KV_TOKEN) {
    // KV not configured — respondents on other devices won't see the session,
    // but the researcher's device will still work via localStorage.
    return Response.json({ ok: false, reason: "KV not configured — session is device-local only" });
  }

  const active: ActiveSession = {
    sessionId: body.sessionId,
    plos: body.plos,
    launched: true,
    launchedAt: new Date().toISOString(),
  };

  try {
    await kvSet(ACTIVE_KEY, active);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/session error:", err);
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}

// ─── DELETE /api/session — researcher resets the active session ───────────────
export async function DELETE() {
  if (!KV_URL || !KV_TOKEN) {
    return Response.json({ ok: false, reason: "KV not configured" });
  }
  try {
    await kvDel(ACTIVE_KEY);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/session error:", err);
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
}
