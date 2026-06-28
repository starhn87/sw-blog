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

function sortPosts(
  sort: SortKey,
  posts: Post[],
  views: Counts,
  likes: Counts,
  comments: Counts,
): Post[] {
  const v = (slug: string) => views.get(slug) ?? 0;
  const l = (slug: string) => likes.get(slug) ?? 0;
  const c = (slug: string) => comments.get(slug) ?? 0;

  // 조회순: 조회수 → 좋아요 → 댓글
  if (sort === "views") {
    return [...posts].sort(
      (a, b) =>
        v(b.slug) - v(a.slug) ||
        l(b.slug) - l(a.slug) ||
        c(b.slug) - c(a.slug),
    );
  }
  // 좋아요순: 좋아요 → 댓글 → 조회수
  if (sort === "likes") {
    return [...posts].sort(
      (a, b) =>
        l(b.slug) - l(a.slug) ||
        c(b.slug) - c(a.slug) ||
        v(b.slug) - v(a.slug),
    );
  }
  return posts;
}

export function HomePostFeed({ posts }: { posts: Post[] }) {
  const [sort, setSort] = useState<SortKey>("recent");
  const [views, setViews] = useState<Counts | null>(null);
  const [likes, setLikes] = useState<Counts | null>(null);
  const [comments, setComments] = useState<Counts | null>(null);
  const [display, setDisplay] = useState<{ sort: SortKey; posts: Post[] }>({
    sort: "recent",
    posts,
  });

  // 조회순·좋아요순 모두 동점 처리를 위해 세 집계가 다 필요하다.
  useEffect(() => {
    if (sort === "recent") return;
    if (!views) fetchCounts(`/api/views?limit=${posts.length}`).then(setViews);
    if (!likes) fetchCounts("/api/likes").then(setLikes);
    if (!comments) fetchCounts("/api/comments").then(setComments);
  }, [sort, views, likes, comments, posts.length]);

  // 필요한 데이터가 모두 준비됐을 때만 정렬을 한 번에 반영한다(중간 재정렬 깜빡임 방지).
  useEffect(() => {
    const ready = sort === "recent" || (!!views && !!likes && !!comments);
    if (ready) {
      setDisplay({
        sort,
        posts: sortPosts(
          sort,
          posts,
          views ?? new Map(),
          likes ?? new Map(),
          comments ?? new Map(),
        ),
      });
    }
  }, [sort, posts, views, likes, comments]);

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
      <PaginatedPosts key={display.sort} posts={display.posts} />
    </section>
  );
}
