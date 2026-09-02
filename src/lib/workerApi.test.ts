import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "./workerApi";
import { POST as nextLike } from "@/app/api/likes/route";
import { GET as nextViews } from "@/app/api/views/route";

const handlers = vi.hoisted(() => ({
  views: { GET: vi.fn(), POST: vi.fn() },
  likes: { GET: vi.fn(), POST: vi.fn() },
  comments: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
  commentLikes: { GET: vi.fn(), POST: vi.fn() },
  analytics: { GET: vi.fn(), POST: vi.fn() },
}));
const context = vi.hoisted(() => ({ env: {} as CloudflareEnv, ctx: { waitUntil: vi.fn() } }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => context }));
vi.mock("./api/views", () => handlers.views);
vi.mock("./api/likes", () => handlers.likes);
vi.mock("./api/comments", () => handlers.comments);
vi.mock("./api/commentLikes", () => handlers.commentLikes);
vi.mock("./api/analytics", () => handlers.analytics);

beforeEach(() => {
  vi.clearAllMocks();
  for (const methods of Object.values(handlers)) {
    for (const handler of Object.values(methods)) {
      handler.mockReset().mockImplementation(async () => Response.json({ ok: true }));
    }
  }
});

describe("framework-independent API dispatch", () => {
  it.each([
    ["views", "views"], ["likes", "likes"], ["comments", "comments"],
    ["comments/likes", "commentLikes"], ["analytics", "analytics"],
  ] as const)("runs GET and POST /api/%s with the original context", async (path, key) => {
    for (const method of ["GET", "POST"] as const) {
      const request = new Request(`https://example.com/api/${path}?slug=post`, { method });
      const response = await handleApiRequest(request, context.env, context.ctx);
      expect(response?.status).toBe(200);
      expect(response?.headers.get("X-API-Runtime")).toBe("worker");
      expect(handlers[key][method]).toHaveBeenCalledWith(request, context.env, context.ctx);
    }
  });

  it.each(["PUT", "DELETE"] as const)("retains comments %s", async (method) => {
    const request = new Request("https://example.com/api/comments", { method });
    expect((await handleApiRequest(request, context.env, context.ctx))?.status).toBe(200);
    expect(handlers.comments[method]).toHaveBeenCalledWith(request, context.env, context.ctx);
  });

  it("preserves private cookies and removes only the HEAD body", async () => {
    handlers.likes.GET.mockResolvedValue(Response.json({ count: 1, liked: true }, {
      headers: { "Set-Cookie": "visitor_id=test; HttpOnly", "Cache-Control": "private, no-store" },
    }));
    const response = await handleApiRequest(new Request("https://example.com/api/likes?slug=post", { method: "HEAD" }), context.env, context.ctx);
    expect(await response?.text()).toBe("");
    expect(response?.headers.get("Set-Cookie")).toBe("visitor_id=test; HttpOnly");
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
    expect(handlers.likes.GET).toHaveBeenCalledOnce();
  });

  it.each([
    ["comments", "DELETE, GET, HEAD, OPTIONS, POST, PUT"],
    ["views", "GET, HEAD, OPTIONS, POST"],
  ])("matches Next's automatic OPTIONS for %s without touching D1", async (path, allow) => {
    const response = await handleApiRequest(new Request(`https://example.com/api/${path}`, { method: "OPTIONS" }), context.env, context.ctx);
    expect(response?.status).toBe(204);
    expect(response?.headers.get("Allow")).toBe(allow);
    expect(handlers.views.GET).not.toHaveBeenCalled();
    expect(handlers.comments.GET).not.toHaveBeenCalled();
  });

  it("returns 405 for unsupported methods without falling through", async () => {
    const response = await handleApiRequest(new Request("https://example.com/api/views", { method: "DELETE" }), context.env, context.ctx);
    expect(response?.status).toBe(405);
    expect(await response?.text()).toBe("");
  });

  it.each(["/api/media", "/api/search", "/api/views/", "/api/views/extra", "/__proto__"])(
    "leaves unregistered path %s to Next", async (path) => {
      expect(await handleApiRequest(new Request(`https://example.com${path}`), context.env, context.ctx)).toBeUndefined();
    },
  );

  it("returns a non-cacheable 500 instead of retrying a failed mutation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    handlers.likes.POST.mockRejectedValue(new Error("D1 failure"));
    try {
      const response = await handleApiRequest(new Request("https://example.com/api/likes", { method: "POST" }), context.env, context.ctx);
      expect(response?.status).toBe(500);
      expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
      expect(handlers.likes.POST).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledOnce();
    } finally {
      log.mockRestore();
    }
  });

  it("uses the same implementations from Next's development route adapters", async () => {
    const request = new Request("https://example.com/api/likes", { method: "POST" });
    await nextLike(request);
    expect(handlers.likes.POST).toHaveBeenCalledWith(request, context.env, context.ctx);
    const read = new Request("https://example.com/api/views");
    await nextViews(read);
    expect(handlers.views.GET).toHaveBeenCalledWith(read, context.env);
  });
});
