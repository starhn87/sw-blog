"use client";

import { useState, useEffect } from "react";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

type SortKey = "recent" | "views" | "likes";
type Counts = Map<string, number>;

const SORTS: [SortKey, string][] = [
  ["recent", "최근순"],
  ["views", "조회순"],
  ["likes", "좋아요순"],
];

async function fetchCounts(url: string): Promise<Counts> {
  try {
    const rows = (await (await fetch(url)).json()) as {
      slug: string;
      count: number;
    }[];
    return new Map(rows.map((r) => [r.slug, r.count]));
  } catch {
    return new Map();
  }
}

// 좋아요 동점일 때 조회수·댓글·최신성에 가중치를 둔 보조 점수
function tieScore(post: Post, views: Counts | null, comments: Counts | null) {
  const v = views?.get(post.slug) ?? 0;
  const c = comments?.get(post.slug) ?? 0;
  const ageDays = (Date.now() - new Date(post.date).getTime()) / 86_400_000;
  const recency = Math.max(0, 180 - ageDays);
  return v + c * 10 + recency;
}

function sortPosts(
  sort: SortKey,
  posts: Post[],
  views: Counts | null,
  likes: Counts | null,
  comments: Counts | null,
): Post[] {
  if (sort === "views") {
    if (!views) return posts;
    return [...posts].sort(
      (a, b) => (views.get(b.slug) ?? 0) - (views.get(a.slug) ?? 0),
    );
  }
  if (sort === "likes") {
    if (!likes) return posts;
    return [...posts].sort((a, b) => {
      const diff = (likes.get(b.slug) ?? 0) - (likes.get(a.slug) ?? 0);
      if (diff !== 0) return diff;
      return tieScore(b, views, comments) - tieScore(a, views, comments);
    });
  }
  return posts;
}

export function HomePostFeed({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [views, setViews] = useState<Counts | null>(null);
  const [likes, setLikes] = useState<Counts | null>(null);
  const [comments, setComments] = useState<Counts | null>(null);

  useEffect(() => {
    if (sort === "views" && !views) {
      fetchCounts(`/api/views?limit=${posts.length}`).then(setViews);
    }
    if (sort === "likes") {
      if (!likes) fetchCounts("/api/likes").then(setLikes);
      if (!views) fetchCounts(`/api/views?limit=${posts.length}`).then(setViews);
      if (!comments) fetchCounts("/api/comments").then(setComments);
    }
  }, [sort, views, likes, comments, posts.length]);

  const sortedPosts = sortPosts(sort, posts, views, likes, comments);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              sort === key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
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
