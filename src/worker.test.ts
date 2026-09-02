import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./worker";

const handler = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../.open-next/worker.js", () => ({ default: handler }));
vi.mock("../.open-next/ssg-routes.js", () => ({ default: {
  "/cached-page": {
    html: "/cdn-cgi/_ssg/build/html.bin", rsc: "/cdn-cgi/_ssg/build/rsc.bin",
    segments: { "/_tree": "/cdn-cgi/_ssg/build/tree.bin" },
    headers: { "x-nextjs-stale-time": "300" }, status: 200,
  },
} }));
const assets = { fetch: vi.fn() };
const env = { ASSETS: assets } as unknown as Cloudflare.Env;
const ctx = {} as ExecutionContext;

function incoming(url: string, init?: RequestInit) {
  return new Request(url, init) as Request<unknown, IncomingRequestCfProperties>;
}

beforeEach(() => {
  assets.fetch.mockReset().mockImplementation(async (request: Request) => new Response(
    request.method === "HEAD" ? null : new URL(request.url).pathname,
    { headers: { ETag: '"asset-hash"', "Content-Type": "application/octet-stream" } },
  ));
  handler.fetch.mockReset().mockImplementation(async () => new Response("Next response", {
    headers: { "Content-Type": "text/html", "Set-Cookie": "test=1; HttpOnly" },
  }));
});

describe("Prerendered response streaming", () => {
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
    const response = await worker.fetch(incoming("https://sw-blog-preview.example.workers.dev/api/comments", { method }), env, ctx);
    expect(response.status).toBe(403);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(handler.fetch).not.toHaveBeenCalled();
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
