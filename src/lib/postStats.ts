"use client";

type Stat = "views" | "weeklyViews" | "likes" | "comments";
const urls: Record<Stat, string> = {
  views: "/api/views",
  weeklyViews: "/api/views?days=7",
  likes: "/api/likes",
  comments: "/api/comments",
};
const cache = new Map<Stat, { promise: Promise<Map<string, number>>; expiresAt: number }>();
const invalidated = new Set<Stat>();

export function invalidatePostStats(...stats: Stat[]) {
  for (const stat of stats) {
    cache.delete(stat);
    invalidated.add(stat);
  }
}

export function loadPostCounts(stat: Stat): Promise<Map<string, number>> {
  const cached = cache.get(stat);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const entry = {
    expiresAt: Infinity,
    promise: fetch(urls[stat], invalidated.has(stat) ? { cache: "reload" } : {})
      .then(async (response) => {
        if (!response.ok) throw new Error(`Stats request failed: ${response.status}`);
        const rows: unknown = await response.json();
        if (!Array.isArray(rows) || !rows.every((row) =>
          row !== null && typeof row === "object" && typeof row.slug === "string" &&
          typeof row.count === "number" && Number.isFinite(row.count) && row.count >= 0,
        )) throw new Error("Invalid post statistics");
        if (cache.get(stat) === entry) {
          entry.expiresAt = Date.now() + 60_000;
          invalidated.delete(stat);
        }
        return new Map<string, number>(rows.map((row) => [row.slug, row.count]));
      })
      .catch((error: unknown) => {
        if (cache.get(stat) === entry) cache.delete(stat);
        throw error;
      }),
  };
  cache.set(stat, entry);
  return entry.promise;
}
