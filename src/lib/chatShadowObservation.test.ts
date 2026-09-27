import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { recordChatObservation, collectChatObservations } from "./chatShadowObservation";
import { GET, POST } from "./api/jevShadow";
import type { ContextAssessment } from "./chatContextDecision";

const stores: DatabaseSync[] = [];
function fixture() {
  const sqlite = new DatabaseSync(":memory:"); stores.push(sqlite);
  sqlite.exec(readFileSync("drizzle/migrations/0007_jev_shadow.sql", "utf8"));
  const prepare = (sql: string) => {
    const stmt = sqlite.prepare(sql);
    let values: SQLInputValue[] = [];
    const api = { bind(...args: SQLInputValue[]) { values = args; return api; },
      async all() { return { results: stmt.all(...values) }; },
      async run() { return { meta: stmt.run(...values) }; } };
    return api;
  };
  const db = { prepare, batch: (items: ReturnType<typeof prepare>[]) => Promise.all(items.map(item => item.all())) } as unknown as D1Database;
  return { sqlite, db, env: { DB: db, ADMIN_PASSWORD: "test-admin" } as CloudflareEnv };
}
afterEach(() => { for (const db of stores.splice(0)) db.close(); });
const result = (durationMs: number, ok = true): ContextAssessment => {
  const meta = { definitionId: "blog-context", definitionVersion: "1", requestedModel: "jev-1.13.0", model: "jev-1.13.0", requestId: "private-request-id", durationMs, inputTokens: ok ? 12 : null, outputTokens: ok ? 3 : null };
  const answer = { type: "choice", choice: "needed", confidence: .9, probabilities: { needed: .98, not_needed: .01, uncertain: .01 } } as const;
  return ok ? { ok: true, answers: { about: answer, code: answer, posts: answer }, meta } : { ok: false, error: { kind: "timeout" }, meta };
};

describe("private shadow observations", () => {
  it("stores bounded metadata and computes full-window latency, failures and unknown tokens using real SQLite", async () => {
    const { db, sqlite } = fixture();
    for (const [duration, ok] of [[100, true], [300, true], [1000, false]] as const) await recordChatObservation(db, "shadow", result(duration, ok), new Date("2026-09-27T10:00:00Z"));
    await recordChatObservation(db, "shadow", result(9000), new Date("2026-09-28T00:00:00Z"));
    const data = await collectChatObservations(db, "2026-09-27T00:00:00.000Z", "2026-09-28T00:00:00.000Z");
    expect(data.totals).toMatchObject({ observations: 3, succeeded: 2, failed: 1, p50Ms: 300, p95Ms: 1000, inputTokens: 24, outputTokens: 6, unknownInputTokens: 1 });
    expect(data.qualityReviewedCases).toBe(0);
    expect(data.groups).toHaveLength(2);
    expect(JSON.stringify(sqlite.prepare("SELECT * FROM jev_shadow_events").all())).not.toContain("private-request-id");
  });
  it("authenticates before reading, rejects invalid dates and distinguishes empty observations", async () => {
    const { env } = fixture();
    expect((await GET(new Request("https://test/api/admin/jev-shadow"), env)).status).toBe(401);
    const query = new URLSearchParams({ start: "2026-09-27T00:00:00.000Z", end: "2026-09-28T00:00:00.000Z" });
    const request = () => new Request(`https://test/api/admin/jev-shadow?${query}`, { headers: { "x-admin-password": "test-admin" } });
    const response = await GET(request(), env);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const data = await response.json() as { totals: Record<string, unknown> };
    expect(data.totals).toMatchObject({ observations: 0, inputTokens: null, p95Ms: null });
    query.set("start", "2026-02-31T00:00:00.000Z");
    expect((await GET(request(), env)).status).toBe(400);
  });
  it("authenticated retention removes only observations older than 90 days", async () => {
    const { db, env } = fixture();
    await recordChatObservation(db, "shadow", result(100), new Date(0));
    await recordChatObservation(db, "shadow", result(200));
    expect((await POST(new Request("https://test/api/admin/jev-shadow", { method: "POST" }), env)).status).toBe(401);
    const response = await POST(new Request("https://test/api/admin/jev-shadow", { method: "POST", headers: { "x-admin-password": "test-admin" } }), env);
    expect(await response.json()).toMatchObject({ retentionDays: 90, deleted: 1 });
    const data = await collectChatObservations(db, "1970-01-01T00:00:00.000Z", "2999-01-01T00:00:00.000Z");
    expect(data.totals.observations).toBe(1);
  });
});
