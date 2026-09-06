import { describe, expect, it } from "vitest";
import {
  isMissingStaticPage,
  isPublicStatsRequest,
  shouldBypassStatsCache,
} from "./workerPolicy";

function request(path: string, init?: RequestInit): Request {
  return new Request(`https://www.seung-woo.me${path}`, init);
}

describe("static path policy", () => {
  const routes = { "/known": {}, "/_not-found": {} };
  const patterns = [/^\/api(?:\/|$)/i, /^\/dynamic\/[^/]+$/i];

  it("decodes only unreserved bytes when identifying an unregistered page", () => {
    const current = request("/missing-%70age");
    expect(
      isMissingStaticPage(current, new URL(current.url), routes, patterns),
    ).toBe(true);
  });

  it.each(["/known", "/api/missing", "/dynamic/id", "/missing%2Fpage", "/missing/"])(
    "leaves registered or ambiguous path %s to Next.js",
    (path) => {
      const current = request(path);
      expect(
        isMissingStaticPage(current, new URL(current.url), routes, patterns),
      ).toBe(false);
    },
  );
});

describe("public statistics policy", () => {
  it.each(["/api/views", "/api/views?days=7", "/api/likes", "/api/comments"])(
    "allows the aggregate endpoint %s",
    (path) => {
      const current = request(path);
      expect(isPublicStatsRequest(current, new URL(current.url))).toBe(true);
    },
  );

  it.each(["/api/views?days=30", "/api/likes?slug=post", "/api/media"])(
    "rejects non-aggregate endpoint %s",
    (path) => {
      const current = request(path);
      expect(isPublicStatsRequest(current, new URL(current.url))).toBe(false);
    },
  );

  it("bypasses cache for request variants, revalidation, and preview cookies", () => {
    expect(
      shouldBypassStatsCache(
        request("/api/views", { headers: { RSC: "1" } }),
        "",
      ),
    ).toBe(true);
    expect(
      shouldBypassStatsCache(
        request("/api/views", {
          headers: { "Cache-Control": "max-age=0" },
        }),
        "",
      ),
    ).toBe(true);
    expect(
      shouldBypassStatsCache(
        request("/api/views"),
        "__prerender_bypass=draft",
      ),
    ).toBe(true);
    expect(
      shouldBypassStatsCache(request("/api/views"), "visitor_id=reader"),
    ).toBe(false);
  });
});
