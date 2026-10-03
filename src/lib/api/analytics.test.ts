import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./analytics";

let sqlite: DatabaseSync;
let env: CloudflareEnv;

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("drizzle/migrations/0006_reader_analytics.sql", "utf8"));
  const prepare = (sql: string) => {
    const statement = sqlite.prepare(sql);
    let values: SQLInputValue[] = [];
    const query = {
      bind(...args: SQLInputValue[]) { values = args; return query; },
      async all() { return { results: statement.all(...values) }; },
      async run() { return { meta: statement.run(...values) }; },
    };
    return query;
  };
  const db = {
    prepare,
    batch: (queries: ReturnType<typeof prepare>[]) => Promise.all(queries.map((query) => query.all())),
  } as unknown as D1Database;
  env = { DB: db } as CloudflareEnv;
});

afterEach(() => sqlite.close());

describe("reader analytics API", () => {
  it("returns bounded daily event and source totals without visitor identifiers", async () => {
    const insert = sqlite.prepare("INSERT INTO analytics_events (day, event, slug, source, visitor_hash) VALUES (?, ?, ?, ?, ?)");
    insert.run("2026-09-20", "post_view", "example", "", "before-range");
    insert.run("2026-09-21", "post_view", "example", "", "visitor-1");
    insert.run("2026-09-21", "post_view", "example", "", "visitor-2");
    insert.run("2026-09-22", "post_view", "example", "", "visitor-3");
    insert.run("2026-09-22", "post_click", "example", "home", "visitor-3");
    insert.run("2026-09-23", "post_view", "example", "", "after-range");

    const response = await GET(new Request("https://test/api/analytics?start=2026-09-21&end=2026-09-23"), env);
    const data = await response.json();

    expect(data).toMatchObject({
      postReaders: { total: 3 },
      daily: [
        { day: "2026-09-21", event: "post_view", count: 2 },
        { day: "2026-09-22", event: "post_click", count: 1 },
        { day: "2026-09-22", event: "post_view", count: 1 },
      ],
      dailySources: [
        { day: "2026-09-22", event: "post_click", source: "home", count: 1 },
      ],
    });
    expect(JSON.stringify(data)).not.toContain("visitor-1");
    expect(JSON.stringify(data)).not.toContain("visitorHash");
  });

  it("keeps the event introduction date separate from an empty observed period", async () => {
    const response = await GET(new Request("https://test/api/analytics?start=2026-09-21&end=2026-09-28"), env);
    const data = await response.json();

    expect(data).toMatchObject({
      coverage: { events: { post_view: "2026-09-08" } },
      daily: [],
      dailySources: [],
    });
  });

  it("deduplicates a repeated click with the same daily visitor using real SQLite", async () => {
    const request = () => new Request("https://test/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "visitor_id=test-visitor" },
      body: JSON.stringify({ event: "post_click", slug: "example", source: "home" }),
    });

    expect((await POST(request(), env)).status).toBe(204);
    expect((await POST(request(), env)).status).toBe(204);
    expect(sqlite.prepare("SELECT event, slug, source, COUNT(*) AS count FROM analytics_events GROUP BY event, slug, source").all()).toEqual([
      { event: "post_click", slug: "example", source: "home", count: 1 },
    ]);
  });
});
