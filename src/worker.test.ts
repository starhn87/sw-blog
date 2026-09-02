import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./worker";

const handler = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../.open-next/worker.js", () => ({ default: handler }));
// The wrapper forwards these without reading bindings or context properties.
const env = {} as CloudflareEnv;
const ctx = {} as ExecutionContext;

function incoming(url: string, init?: RequestInit) {
  return new Request(url, init) as Request<unknown, IncomingRequestCfProperties>;
}

beforeEach(() => {
  handler.fetch.mockReset().mockImplementation(async () => new Response("Next response", {
    headers: { "Content-Type": "text/html", "Set-Cookie": "test=1; HttpOnly" },
  }));
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
