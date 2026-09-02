import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(async () => Response.json([{ slug: "post", count: 3 }]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("shared listing statistics", () => {
  it("shares pending requests even if they take longer than the TTL", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { loadPostCounts } = await import("./postStats");
    const first = loadPostCounts("views");
    vi.advanceTimersByTime(61_000);
    expect(loadPostCounts("views")).toBe(first);
    resolve(Response.json([{ slug: "post", count: 3 }]));
    expect((await first).get("post")).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses fresh data and refreshes after 60 seconds", async () => {
    const { loadPostCounts } = await import("./postStats");
    const counts = await loadPostCounts("likes");
    vi.advanceTimersByTime(59_999);
    expect(await loadPostCounts("likes")).toBe(counts);
    vi.advanceTimersByTime(1);
    await loadPostCounts("likes");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps weekly views separate and shares each of the other statistics", async () => {
    const { loadPostCounts } = await import("./postStats");
    await Promise.all(["views", "weeklyViews", "likes", "comments", "views", "likes"].map(
      (stat) => loadPostCounts(stat as Parameters<typeof loadPostCounts>[0]),
    ));
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/views", "/api/views?days=7", "/api/likes", "/api/comments",
    ]);
  });

  it.each([Response.json({ error: "unavailable" }, { status: 503 }), Response.json([{ slug: "post", count: "3" }])])(
    "does not cache failures or invalid data", async (response) => {
      const { loadPostCounts } = await import("./postStats");
      fetchMock.mockResolvedValueOnce(response);
      await expect(loadPostCounts("comments")).rejects.toThrow();
      expect((await loadPostCounts("comments")).get("post")).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("bypasses HTTP caches after mutations without invalidating unrelated counts", async () => {
    const { loadPostCounts, invalidatePostStats } = await import("./postStats");
    await Promise.all([loadPostCounts("views"), loadPostCounts("likes")]);
    invalidatePostStats("likes");
    await Promise.all([loadPostCounts("views"), loadPostCounts("likes")]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/likes", { cache: "reload" });
    vi.advanceTimersByTime(60_000);
    await loadPostCounts("likes");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/likes", {});
  });

  it("does not restore a stale pending request after invalidation", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const { loadPostCounts, invalidatePostStats } = await import("./postStats");
    const old = loadPostCounts("views");
    invalidatePostStats("views");
    const fresh = await loadPostCounts("views");
    resolve(Response.json([{ slug: "post", count: 1 }]));
    await old;
    expect(await loadPostCounts("views")).toBe(fresh);
    expect(fresh.get("post")).toBe(3);
  });
});
