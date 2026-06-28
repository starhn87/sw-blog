"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  if (sort === "views") {
    return [...posts].sort(
      (a, b) =>
        v(b.slug) - v(a.slug) ||
        l(b.slug) - l(a.slug) ||
        c(b.slug) - c(a.slug),
    );
  }
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort");
  const sort: SortKey =
    sortParam === "views" || sortParam === "likes" ? sortParam : "recent";

  const [views, setViews] = useState<Counts | null>(null);
  const [likes, setLikes] = useState<Counts | null>(null);
  const [comments, setComments] = useState<Counts | null>(null);
  const [display, setDisplay] = useState<{ sort: SortKey; posts: Post[] }>({
    sort: "recent",
    posts,
  });

  function selectSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "recent") params.delete("sort");
    else params.set("sort", key);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  useEffect(() => {
    if (sort === "recent") return;
    if (!views) fetchCounts(`/api/views?limit=${posts.length}`).then(setViews);
    if (!likes) fetchCounts("/api/likes").then(setLikes);
    if (!comments) fetchCounts("/api/comments").then(setComments);
  }, [sort, views, likes, comments, posts.length]);

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
            onClick={() => selectSort(key)}
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
