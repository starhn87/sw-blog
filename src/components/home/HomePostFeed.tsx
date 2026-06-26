"use client";

import { useState, useEffect } from "react";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

type SortKey = "recent" | "popular";

const SORTS: [SortKey, string][] = [
  ["recent", "최근순"],
  ["popular", "인기순"],
];

export function HomePostFeed({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [counts, setCounts] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (sort !== "popular" || counts) return;
    fetch(`/api/views?limit=${posts.length}`)
      .then((r) => r.json() as Promise<{ slug: string; count: number }[]>)
      .then((rows) => setCounts(new Map(rows.map((r) => [r.slug, r.count]))))
      .catch(() => setCounts(new Map()));
  }, [sort, counts, posts.length]);

  const sortedPosts =
    sort === "popular" && counts
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
