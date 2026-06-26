"use client";

import { useState, useEffect } from "react";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

type SortKey = "recent" | "views" | "likes";

const SORTS: [SortKey, string][] = [
  ["recent", "최근순"],
  ["views", "조회순"],
  ["likes", "좋아요순"],
];

export function HomePostFeed({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [viewCounts, setViewCounts] = useState<Map<string, number> | null>(null);
  const [likeCounts, setLikeCounts] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (sort === "views" && !viewCounts) {
      fetch(`/api/views?limit=${posts.length}`)
        .then((r) => r.json() as Promise<{ slug: string; count: number }[]>)
        .then((rows) =>
          setViewCounts(new Map(rows.map((r) => [r.slug, r.count]))),
        )
        .catch(() => setViewCounts(new Map()));
    }
    if (sort === "likes" && !likeCounts) {
      fetch("/api/likes")
        .then((r) => r.json() as Promise<{ slug: string; count: number }[]>)
        .then((rows) =>
          setLikeCounts(new Map(rows.map((r) => [r.slug, r.count]))),
        )
        .catch(() => setLikeCounts(new Map()));
    }
  }, [sort, viewCounts, likeCounts, posts.length]);

  const counts =
    sort === "views" ? viewCounts : sort === "likes" ? likeCounts : null;

  const sortedPosts = counts
    ? [...posts].sort(
        (a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0),
      )
    : posts;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-1">
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              sort === key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <PaginatedPosts posts={sortedPosts} />
    </section>
  );
}
