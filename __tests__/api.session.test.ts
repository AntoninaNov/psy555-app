/**
 * Tests for GET / POST / DELETE /api/session
 *
 * Architecture contract:
 *  - POST /api/session (researcher launches) → stores { sessionId, plos, launched:true } in KV
 *  - GET  /api/session (respondent loads)   → returns the stored session, or { launched:false }
 *  - DELETE /api/session                    → clears the active session
 *
 * KV is mocked via vi.stubGlobal("fetch", ...) so no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PLO } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal PLO for test data */
function makePlo(id: string, title: string): PLO {
  return { id, shortTitle: title, paraphrase: `Description of ${title}` };
}

const SAMPLE_PLOS: PLO[] = Array.from({ length: 14 }, (_, i) =>
  makePlo(`plo-${i + 1}`, `Skill ${i + 1}`)
);

const SESSION_ID = "test-session-001";

/** Make a Response-like object mimicking the KV REST API reply for a GET.
 *
 * kvSet sends body = JSON.stringify(JSON.stringify(value)).
 * Upstash stores the raw body string (including the outer quotes).
 * On GET, json.result = that stored string, so JSON.parse(result) still yields a string.
 * kvGet now does a second parse when the first yields a string.
 */
function kvGetResponse(value: unknown) {
  if (value === null) {
    return { ok: true, json: async () => ({ result: null }) };
  }
  // Replicate what Upstash stores and returns:
  // stored = JSON.stringify(JSON.stringify(value))  (the raw POST body)
  // result in GET response = that stored string (no additional encoding)
  const result = JSON.stringify(JSON.stringify(value));
  return {
    ok: true,
    json: async () => ({ result }),
  };
}

/** Make a Response-like object for a KV set/del */
function kvSetResponse() {
  return { ok: true, json: async () => ({}) };
}

// ─── Each test uses fresh module + fresh env ───────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  process.env.KV_REST_API_URL   = "https://kv.example.com";
  process.env.KV_REST_API_TOKEN = "test-token-abc";
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

// ─── GET /api/session ──────────────────────────────────────────────────────────

describe("GET /api/session", () => {
  it("returns { launched: false, plos: [] } when KV has no active session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(kvGetResponse(null)));

    const { GET } = await import("@/app/api/session/route");
    const res  = await GET();
    const data = await res.json();

    expect(data.launched).toBe(false);
    expect(data.plos).toEqual([]);
  });

  it("returns the stored session when KV has one", async () => {
    const stored = {
      sessionId: SESSION_ID,
      plos: SAMPLE_PLOS,
      launched: true,
      launchedAt: "2026-04-09T10:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(kvGetResponse(stored)));

    const { GET } = await import("@/app/api/session/route");
    const res  = await GET();
    const data = await res.json();

    expect(data.launched).toBe(true);
    expect(data.sessionId).toBe(SESSION_ID);
    expect(data.plos).toHaveLength(14);
    expect(data.plos[0].shortTitle).toBe("Skill 1");
  });

  it("returns { launched: false } when KV REST call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    const { GET } = await import("@/app/api/session/route");
    const res  = await GET();
    const data = await res.json();

    expect(data.launched).toBe(false);
  });

  it("returns { launched: false } when KV is not configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const { GET } = await import("@/app/api/session/route");
    const res  = await GET();
    const data = await res.json();

    expect(data.launched).toBe(false);
  });
});

// ─── POST /api/session ─────────────────────────────────────────────────────────

describe("POST /api/session", () => {
  it("stores the session and returns { ok: true } when KV is configured", async () => {
    const mockFetch = vi.fn().mockResolvedValue(kvSetResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/session/route");
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, plos: SAMPLE_PLOS }),
    });

    const res  = await POST(req as never);
    const data = await res.json();

    expect(data.ok).toBe(true);

    // Verify that fetch was called with the KV set endpoint (key is URL-encoded)
    const [[url, opts]] = mockFetch.mock.calls;
    expect(decodeURIComponent(url as string)).toContain("psy555:active-session");
    expect(opts.method).toBe("POST");

    // The stored body should contain the session data
    const storedValue = JSON.parse(JSON.parse(opts.body));
    expect(storedValue.sessionId).toBe(SESSION_ID);
    expect(storedValue.launched).toBe(true);
    expect(storedValue.plos).toHaveLength(14);
  });

  it("returns { ok: false } with a reason when KV is not configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const { POST } = await import("@/app/api/session/route");
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, plos: SAMPLE_PLOS }),
    });

    const res  = await POST(req as never);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(data.reason).toMatch(/KV not configured/i);
  });

  it("returns 400 when body is missing required fields", async () => {
    const { POST } = await import("@/app/api/session/route");
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "" }), // missing plos
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when plos array is empty", async () => {
    const { POST } = await import("@/app/api/session/route");
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, plos: [] }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const { POST } = await import("@/app/api/session/route");
    const req = new Request("http://localhost/api/session", {
      method: "POST",
      body: "not-json",
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/session ───────────────────────────────────────────────────────

describe("DELETE /api/session", () => {
  it("deletes the active session from KV and returns { ok: true }", async () => {
    const mockFetch = vi.fn().mockResolvedValue(kvSetResponse());
    vi.stubGlobal("fetch", mockFetch);

    const { DELETE } = await import("@/app/api/session/route");
    const res  = await DELETE();
    const data = await res.json();

    expect(data.ok).toBe(true);
    const [[url, opts]] = mockFetch.mock.calls;
    expect(decodeURIComponent(url as string)).toContain("psy555:active-session");
    expect(opts.method).toBe("POST"); // Upstash uses POST for /del/
  });

  it("returns { ok: false } when KV is not configured", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const { DELETE } = await import("@/app/api/session/route");
    const res  = await DELETE();
    const data = await res.json();

    expect(data.ok).toBe(false);
  });
});

// ─── Round-trip: POST then GET ─────────────────────────────────────────────────

describe("round-trip: POST then GET", () => {
  it("GET returns the exact session that was POSTed", async () => {
    let kvStore: string | null = null;

    // Mock fetch: intercept KV set and get, simulating Upstash's raw-body storage
    vi.stubGlobal("fetch", vi.fn(async (url: string, opts?: RequestInit) => {
      if (opts?.method === "POST" && (url as string).includes("/set/")) {
        // Upstash stores the raw POST body string (including outer quotes from double-encode)
        kvStore = opts.body as string;
        return { ok: true, json: async () => ({}) };
      }
      if ((url as string).includes("/get/")) {
        return { ok: true, json: async () => ({ result: kvStore }) };
      }
      return { ok: true, json: async () => ({}) };
    }));

    const mod = await import("@/app/api/session/route");

    // POST
    const postReq = new Request("http://localhost/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, plos: SAMPLE_PLOS }),
    });
    await mod.POST(postReq as never);

    // GET
    const getRes  = await mod.GET();
    const getData = await getRes.json();

    expect(getData.launched).toBe(true);
    expect(getData.sessionId).toBe(SESSION_ID);
    expect(getData.plos).toHaveLength(14);
  });
});
