"use client";

import { useState, useEffect, useMemo } from "react";
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

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-border"
        >
          <div className="aspect-[21/9] w-full animate-pulse bg-muted" />
          <div className="space-y-3 p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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

  // recent는 즉시 정렬 없이 보여주고, 조회순/좋아요순은 집계가 모두 도착해야 정렬한다.
  // 아직 로딩 중이면 null을 반환해 스켈레톤을 띄운다. 렌더 중에 계산하므로
  // 데이터 도착 순간 곧바로 새 정렬로 바뀌어 이전 목록이 깜빡이지 않는다.
  const displayPosts = useMemo(() => {
    if (sort === "recent") return posts;
    if (views && likes && comments) {
      return sortPosts(sort, posts, views, likes, comments);
    }
    return null;
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
      {displayPosts === null ? (
        <FeedSkeleton />
      ) : (
        <PaginatedPosts key={sort} posts={displayPosts} />
      )}
    </section>
  );
}
