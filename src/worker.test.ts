import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./worker";

const handler = vi.hoisted(() => ({ fetch: vi.fn() }));
const nativeApi = vi.hoisted(() => vi.fn());
vi.mock("./lib/workerApi", () => ({ handleApiRequest: nativeApi }));
vi.mock("../.open-next/worker.js", () => ({ default: handler }));
vi.mock("../.open-next/ssg-routes.js", () => ({
  nextRoutePatterns: [
    "^/blog$", "^/api/(?:views|likes|comments(?:/likes)?|analytics|media|search(?:/index)?|chat(?:/index)?|push/subscribe)(?:/)?$",
    "^/live/[^/]+$", "^/isr$", "^/logo\\.svg$", "^/legacy$", "^/rewritten/.*$", "^/protected/.*$",
  ],
  default: {
  "/cached-page": {
    html: "/cdn-cgi/_ssg/build/html.bin", rsc: "/cdn-cgi/_ssg/build/rsc.bin",
    segments: { "/_tree": "/cdn-cgi/_ssg/build/tree.bin" },
    headers: { "x-nextjs-stale-time": "300" }, status: 200,
  },
  "/_not-found": {
    html: "/cdn-cgi/_ssg/build/404.bin", segments: {}, headers: {}, status: 404,
  },
  "/blog/tag": {
    html: "/cdn-cgi/_ssg/build/tag.bin", segments: {}, headers: {}, status: 200,
  },
  "/feed.xml": {
    body: "/cdn-cgi/_ssg/build/feed.bin", segments: {}, status: 200,
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=3600" },
  },
} }));
const assets = { fetch: vi.fn() };
const env = { ASSETS: assets } as unknown as Cloudflare.Env;
const waitUntil = vi.fn();
const ctx = {} as ExecutionContext;
ctx.waitUntil = waitUntil;
const statsCache = { match: vi.fn(), put: vi.fn() };

function incoming(url: string, init?: RequestInit) {
  return new Request(url, init) as Request<unknown, IncomingRequestCfProperties>;
}

beforeEach(() => {
  nativeApi.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("caches", { open: vi.fn().mockResolvedValue(statsCache) });
  statsCache.match.mockReset().mockResolvedValue(undefined);
  statsCache.put.mockReset().mockResolvedValue(undefined);
  waitUntil.mockReset();
  assets.fetch.mockReset().mockImplementation(async (request: Request) => new Response(
    request.method === "HEAD" ? null : new URL(request.url).pathname,
    { headers: { ETag: '"asset-hash"', "Content-Type": "application/octet-stream" } },
  ));
  handler.fetch.mockReset().mockImplementation(async () => new Response("Next response", {
    headers: { "Content-Type": "text/html", "Set-Cookie": "test=1; HttpOnly" },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Public statistics cache", () => {
  it.each(["/api/views", "/api/views?days=7", "/api/likes", "/api/comments"])(
    "caches only a successful public aggregate at %s for 30 seconds", async (path) => {
      handler.fetch.mockResolvedValue(Response.json([{ slug: "post", count: 3 }], {
        headers: { Vary: "rsc, next-router-state-tree" },
      }));
      const response = await worker.fetch(incoming(`https://preview.example.workers.dev${path}`, {
        headers: { cookie: "visitor_id=reader" },
      }), env, ctx);
      expect(response.headers.get("X-Stats-Cache")).toBe("MISS");
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
      const [key, cached] = statsCache.put.mock.calls[0];
      expect(key.url).toBe(`https://preview.example.workers.dev/cdn-cgi/_stats/v1${path}`);
      expect([...key.headers]).toEqual([]);
      expect(cached.headers.get("Cache-Control")).toBe("public, max-age=30");
      expect(await cached.json()).toEqual(await response.json());
      expect(waitUntil).toHaveBeenCalledOnce();
    },
  );

  it("serves cache hits before Next and keeps browser revalidation and preview policy", async () => {
    statsCache.match.mockResolvedValue(Response.json([{ slug: "post", count: 3 }], {
      headers: { "Cache-Control": "public, max-age=30" },
    }));
    const response = await worker.fetch(incoming("https://preview.example.workers.dev/api/views"), env, ctx);
    expect(response.headers.get("X-Stats-Cache")).toBe("HIT");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
    expect(handler.fetch).not.toHaveBeenCalled();
    expect(statsCache.put).not.toHaveBeenCalled();
  });

  it.each([
    "/api/likes?slug=post", "/api/comments?slug=post", "/api/views?slug=post",
    "/api/views?days=7&limit=25", "/api/views?days=7&days=1", "/api/views?days=8",
    "/api/comments?slug=", "/api/views?_rsc=abc", "/api/media", "/api/analytics",
  ])("does not cache personalized or non-allowlisted URL %s", async (path) => {
    await worker.fetch(incoming(`https://www.seung-woo.me${path}`), env, ctx);
    expect(statsCache.match).not.toHaveBeenCalled();
    expect(statsCache.put).not.toHaveBeenCalled();
  });

  it.each<RequestInit>([
    { method: "POST" }, { method: "HEAD" }, { method: "OPTIONS" },
    { headers: { Authorization: "Bearer test" } }, { headers: { "X-Admin-Password": "test" } },
    { headers: { RSC: "1" } }, { headers: { "Next-Router-Prefetch": "1" } },
    { headers: { Range: "bytes=0-10" } }, { headers: { "Cache-Control": "no-cache" } },
    { headers: { "Cache-Control": "max-age=0" } }, { headers: { "Cache-Control": "no-store" } },
    { headers: { Pragma: "no-cache" } }, { headers: { cookie: "__prerender_bypass=test" } },
  ])("bypasses both cache reads and writes for %j", async (options) => {
    const request = incoming("https://www.seung-woo.me/api/views", options);
    handler.fetch.mockResolvedValue(Response.json([]));
    await worker.fetch(request, env, ctx);
    expect(statsCache.match).not.toHaveBeenCalled();
    expect(statsCache.put).not.toHaveBeenCalled();
    expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
  });

  it.each<ResponseInit>([
    { status: 500 }, { headers: { "Set-Cookie": "visitor_id=private" } },
    { headers: { "Cache-Control": "private, max-age=60" } },
    { headers: { "Cache-Control": "no-store" } },
    { headers: { Vary: "Cookie" } }, { headers: { Vary: "*" } },
  ])("never stores non-public responses %j", async (options) => {
    handler.fetch.mockResolvedValue(Response.json({ count: 3 }, options));
    const response = await worker.fetch(incoming("https://www.seung-woo.me/api/views"), env, ctx);
    expect(response.status).toBe(options.status ?? 200);
    expect(response.headers.get("X-Stats-Cache")).toBe("BYPASS");
    expect(statsCache.put).not.toHaveBeenCalled();
  });

  it("isolates hosts and weekly/all-time keys", async () => {
    for (const url of ["https://preview.example.workers.dev/api/views", "https://www.seung-woo.me/api/views", "https://www.seung-woo.me/api/views?days=7"]) {
      await worker.fetch(incoming(url), env, ctx);
    }
    expect(new Set(statsCache.match.mock.calls.map(([key]) => key.url)).size).toBe(3);
  });

  it("does not turn a cache service failure into an API failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    statsCache.match.mockRejectedValue(new Error("Cache unavailable"));
    statsCache.put.mockRejectedValue(new Error("Cache unavailable"));
    handler.fetch.mockResolvedValue(Response.json([]));
    const response = await worker.fetch(incoming("https://www.seung-woo.me/api/views"), env, ctx);
    await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));
    expect(response.status).toBe(200);
    expect(log).toHaveBeenCalledTimes(2);
  });
});

describe("Prerendered response streaming", () => {
  it.each([{}, { RSC: "1", "Next-Router-Segment-Prefetch": "/_tree" }])(
    "streams metadata with its own content type and cache policy for %j", async (headers) => {
      const response = await worker.fetch(incoming("https://preview.example.workers.dev/feed.xml", {
        headers: headers as HeadersInit,
      }), env, ctx);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("/cdn-cgi/_ssg/build/feed.bin");
      expect(response.headers.get("Content-Type")).toBe("application/rss+xml; charset=utf-8");
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600, s-maxage=3600");
      expect(response.headers.get("X-SSG-Cache")).toBe("HIT");
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(response.headers.has("x-nextjs-postponed")).toBe(false);
      expect(handler.fetch).not.toHaveBeenCalled();
    },
  );

  it("streams missing post HTML as a non-cacheable 404, never a conditional 304", async () => {
    const response = await worker.fetch(incoming("https://www.seung-woo.me/blog/missing-post", {
      headers: { "If-None-Match": '"asset-hash"', "If-Modified-Since": "Wed, 02 Sep 2026 00:00:00 GMT" },
    }), env, ctx);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("/cdn-cgi/_ssg/build/404.bin");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("ETag")).toBeNull();
    expect(assets.fetch.mock.calls[0][0].headers.has("If-None-Match")).toBe(false);
    expect(assets.fetch.mock.calls[0][0].headers.has("If-Modified-Since")).toBe(false);
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it("keeps registered tag pages and missing-post HEAD semantics", async () => {
    expect((await worker.fetch(incoming("https://www.seung-woo.me/blog/tag"), env, ctx)).status).toBe(200);
    const head = await worker.fetch(incoming("https://www.seung-woo.me/blog/missing-post", { method: "HEAD" }), env, ctx);
    expect(head.status).toBe(404);
    expect(await head.text()).toBe("");
  });

  it.each([
    { RSC: "1" },
    { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/_tree" },
    { RSC: "1", "Next-Router-Segment-Prefetch": "/missing" },
  ])("returns a non-cacheable 404 document for Next's navigation fallback %j", async (headers) => {
    const response = await worker.fetch(incoming("https://preview.example.workers.dev/blog/missing-post?_rsc=test", {
      headers: { ...headers, "If-None-Match": "*", Range: "bytes=0-10" } as HeadersInit,
    }), env, ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("X-SSG-Cache")).toBe("HIT");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.has("ETag")).toBe(false);
    expect(response.headers.has("x-nextjs-postponed")).toBe(false);
    expect(await response.text()).toBe("/cdn-cgi/_ssg/build/404.bin");
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["/blog/%70ostgis-location-search", {}],
    ["/blog/missing-post/", {}],
    ["/blog/missing-post", { "next-action": "action-id" }],
    ["/blog/missing-post", { cookie: "__prerender_bypass=draft" }],
    ["/unknown-page/", {}],
    ["/unknown//page", {}],
    ["/unknown-page", { "x-prerender-revalidate": "token" }],
    ["/unknown-page", { cookie: "__next_preview_data=draft" }],
    ["/unknown-page", { "x-nextjs-data": "1" }],
    ["/unknown-page?__nextDataReq=1", {}],
    ["/blog/post.rsc", {}],
    ["/blog/%ZZ", {}],
    ["/blog/없는글", {}],
    ["/_next/image", {}],
    ["/_next/static/missing.js", {}],
    ["/cdn-cgi/image/missing", {}],
    ["/api/chat", {}],
    ["/api/chat/", {}],
    ["/api/search/index", {}],
    ["/live/new-id", {}],
    ["/isr", {}],
    ["/logo.svg", {}],
    ["/legacy", {}],
    ["/rewritten/page", {}],
    ["/protected/page", {}],
  ])("leaves ambiguous and draft request %s %j to Next", async (path, headers) => {
    await worker.fetch(incoming(`https://www.seung-woo.me${path}`, { headers: headers as HeadersInit }), env, ctx);
    expect(assets.fetch).not.toHaveBeenCalled();
    expect(handler.fetch).toHaveBeenCalledOnce();
  });

  it.each(["/migration-missing-page", "/missing/nested-page", "/blog/missing_post", "/wp-login.php", "/.env", "/missing-image.png", "/api/missing", "/__proto__"])(
    "streams the same 404 for an unregistered URL %s without calling Next or APIs", async (path) => {
      for (const options of [
        {}, { method: "HEAD" },
        { headers: { RSC: "1" } },
        { headers: { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/_tree" } },
        { headers: { "If-None-Match": "*", "If-Modified-Since": "Wed, 02 Sep 2026 00:00:00 GMT", Range: "bytes=0-10" } },
      ]) {
        const response = await worker.fetch(incoming(`https://preview.example.workers.dev${path}?source=test`, options as RequestInit), env, ctx);
        expect(response.status).toBe(404);
        expect(response.headers.get("X-SSG-Cache")).toBe("HIT");
        expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
        expect(response.headers.get("Cache-Control")).toContain("no-store");
        expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
        expect(response.headers.has("ETag")).toBe(false);
        expect(response.headers.has("x-nextjs-postponed")).toBe(false);
        expect(await response.text()).toBe(options.method === "HEAD" ? "" : "/cdn-cgi/_ssg/build/404.bin");
      }
      expect(handler.fetch).not.toHaveBeenCalled();
      expect(nativeApi).not.toHaveBeenCalled();
    },
  );

  it.each(["POST", "PUT", "DELETE", "OPTIONS"])("leaves unknown-path %s semantics to Next", async (method) => {
    const request = incoming("https://www.seung-woo.me/missing-page", { method });
    await worker.fetch(request, env, ctx);
    expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it.each([
    [{}, "html", "text/html; charset=utf-8"],
    [{ RSC: "1" }, "rsc", "text/x-component"],
    [{ RSC: "1", "Next-Router-Segment-Prefetch": "/_tree" }, "tree", "text/x-component"],
  ] as const)("selects the exact response for %j", async (headers, file, type) => {
    const response = await worker.fetch(incoming("https://preview.example.workers.dev/cached-page?_rsc=abc", { headers }), env, ctx);
    expect(await response.text()).toBe(`/cdn-cgi/_ssg/build/${file}.bin`);
    expect(response.headers.get("Content-Type")).toBe(type);
    expect(response.headers.get("X-SSG-Cache")).toBe("HIT");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("ETag")).toBe('"asset-hash"');
    expect(response.headers.get("x-nextjs-stale-time")).toBe("300");
    expect(response.headers.get("Vary")).toContain("Next-Router-Segment-Prefetch");
    expect(response.headers.get("x-nextjs-postponed")).toBe(file === "tree" ? "2" : null);
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it("preserves HEAD without sending the page body", async () => {
    const response = await worker.fetch(incoming("https://www.seung-woo.me/cached-page", { method: "HEAD" }), env, ctx);
    expect(await response.text()).toBe("");
    expect(assets.fetch.mock.calls[0][0].method).toBe("HEAD");
    expect(response.headers.get("X-SSG-Cache")).toBe("HIT");
    expect(response.headers.has("X-Robots-Tag")).toBe(false);
  });

  it("passes conditional headers through and preserves a 304", async () => {
    assets.fetch.mockResolvedValue(new Response(null, { status: 304, headers: { ETag: '"asset-hash"' } }));
    const response = await worker.fetch(incoming("https://www.seung-woo.me/cached-page", {
      headers: { "If-None-Match": '"asset-hash"', Range: "bytes=0-10" },
    }), env, ctx);
    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(assets.fetch.mock.calls[0][0].headers.get("If-None-Match")).toBe('"asset-hash"');
    expect(assets.fetch.mock.calls[0][0].headers.has("Range")).toBe(false);
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it.each([404, 500])("does not disguise asset failure %i as a cache hit", async (status) => {
    assets.fetch.mockResolvedValue(new Response("Asset failure", { status }));
    const response = await worker.fetch(incoming("https://www.seung-woo.me/cached-page"), env, ctx);
    expect(response.status).toBe(status);
    expect(response.headers.has("X-SSG-Cache")).toBe(false);
  });

  it.each<RequestInit>([
    { method: "POST" }, { method: "OPTIONS" },
    { headers: { "next-action": "action-id" } },
    { headers: { "x-prerender-revalidate": "token" } },
    { headers: { cookie: "__prerender_bypass=draft" } },
    { headers: { cookie: "__next_preview_data=draft" } },
    { headers: { RSC: "1", "Next-Router-Segment-Prefetch": "/missing" } },
    { headers: { RSC: "1", "Next-Router-Segment-Prefetch": "__proto__" } },
  ])("leaves non-static semantics to Next for %j", async (options) => {
    const request = incoming("https://www.seung-woo.me/cached-page", options);
    const response = await worker.fetch(request, env, ctx);
    expect(await response.text()).toBe("Next response");
    expect(assets.fetch).not.toHaveBeenCalled();
    expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
  });
});

describe("Worker request policy", () => {
  it("dispatches native API responses without initializing Next", async () => {
    nativeApi.mockResolvedValue(Response.json({ count: 7, liked: true }, {
      headers: { "Cache-Control": "private, no-store", "Set-Cookie": "visitor_id=reader; HttpOnly" },
    }));
    const request = incoming("https://preview.example.workers.dev/api/likes?slug=post");
    const response = await worker.fetch(request, env, ctx);
    expect(await response.json()).toEqual({ count: 7, liked: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Set-Cookie")).toBe("visitor_id=reader; HttpOnly");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(nativeApi).toHaveBeenCalledWith(request, env, ctx);
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it("keeps native aggregate misses inside the public cache policy", async () => {
    nativeApi.mockResolvedValue(Response.json([{ slug: "post", count: 7 }]));
    const response = await worker.fetch(incoming("https://preview.example.workers.dev/api/views"), env, ctx);
    expect(response.headers.get("X-Stats-Cache")).toBe("MISS");
    expect(statsCache.put).toHaveBeenCalledOnce();
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it("redirects the Pages hostname without losing path or query", async () => {
    const response = await worker.fetch(incoming("https://sw-blog.pages.dev/blog/motomap?q=map"), env, ctx);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://www.seung-woo.me/blog/motomap?q=map");
    expect(handler.fetch).not.toHaveBeenCalled();
  });

  it.each(["preview.sw-blog.pages.dev", "version-sw-blog-preview.example.workers.dev"])(
    "keeps %s out of search results without changing the response", async (host) => {
      const request = incoming(`https://${host}/blog`);
      const response = await worker.fetch(request, env, ctx);
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(response.headers.get("Set-Cookie")).toBe("test=1; HttpOnly");
      expect(await response.text()).toBe("Next response");
      expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks preview %s before calling Next", async (method) => {
    for (const path of ["/api/comments", "/api/comments/"]) {
      const response = await worker.fetch(incoming(`https://sw-blog-preview.example.workers.dev${path}`, { method }), env, ctx);
      expect(response.status).toBe(403);
      expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
      expect(handler.fetch).not.toHaveBeenCalled();
      expect(nativeApi).not.toHaveBeenCalled();
    }
  });

  it.each(["GET", "HEAD", "OPTIONS"])("allows preview %s", async (method) => {
    const request = incoming("https://sw-blog-preview.example.workers.dev/api/comments", { method });
    expect((await worker.fetch(request, env, ctx)).status).toBe(200);
    expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
  });

  it.each(["localhost:3000", "www.seung-woo.me"])("preserves mutations and indexing on %s", async (host) => {
    const request = incoming(`https://${host}/api/comments`, { method: "POST" });
    const response = await worker.fetch(request, env, ctx);
    expect(response.headers.has("X-Robots-Tag")).toBe(false);
    expect(handler.fetch).toHaveBeenCalledWith(request, env, ctx);
  });

  it.each(["sw-blog-preview.example.workers.dev:443", "SW-BLOG-PREVIEW.EXAMPLE.WORKERS.DEV", "sw-blog-preview.example.workers.dev."])(
    "normalizes %s before blocking writes", async (host) => {
      const response = await worker.fetch(incoming(`https://${host}/api/media`, { method: "DELETE" }), env, ctx);
      expect(response.status).toBe(403);
      expect(handler.fetch).not.toHaveBeenCalled();
    },
  );
});
