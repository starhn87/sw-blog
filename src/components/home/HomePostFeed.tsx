"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { loadPostCounts } from "@/lib/postStats";

type SortKey = "recent" | "weekly" | "views" | "likes";
type Counts = Map<string, number>;

const SORTS: [SortKey, string][] = [
  ["recent", "최근순"],
  ["weekly", "주간 인기"],
  ["views", "조회순"],
  ["likes", "좋아요순"],
];

function sortPosts(
  sort: SortKey,
  posts: PostSummary[],
  views: Counts,
  likes: Counts,
  comments: Counts,
): PostSummary[] {
  const v = (slug: string) => views.get(slug) ?? 0;
  const l = (slug: string) => likes.get(slug) ?? 0;
  const c = (slug: string) => comments.get(slug) ?? 0;

  if (sort === "weekly" || sort === "views") {
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

function SortFromUrl({ onChange }: { onChange: (sort: SortKey) => void }) {
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort");
  const sort: SortKey =
    sortParam === "weekly" || sortParam === "views" || sortParam === "likes"
      ? sortParam
      : "recent";
  useEffect(() => { onChange(sort); }, [sort, onChange]);
  return null;
}

export function HomePostFeed({ posts }: { posts: PostSummary[] }) {
  const [sort, setSort] = useState<SortKey>("recent");

  const [views, setViews] = useState<Counts | null>(null);
  const [weeklyViews, setWeeklyViews] = useState<Counts | null>(null);
  const [likes, setLikes] = useState<Counts | null>(null);
  const [comments, setComments] = useState<Counts | null>(null);

  function selectSort(key: SortKey) {
    const params = new URLSearchParams(window.location.search);
    if (key === "recent") params.delete("sort");
    else params.set("sort", key);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
    setSort(key);
  }

  useEffect(() => {
    trackAnalyticsEvent({ event: "listing_view", source: "home" });
  }, []);

  useEffect(() => {
    if (sort === "recent") return;
    let active = true;
    Promise.all([
      loadPostCounts(sort === "weekly" ? "weeklyViews" : "views"),
      loadPostCounts("likes"),
      loadPostCounts("comments"),
    ].map((promise) => promise.catch(() => new Map<string, number>())))
      .then(([rankingViews, likes, comments]) => {
        if (!active) return;
        if (sort === "weekly") setWeeklyViews(rankingViews);
        else setViews(rankingViews);
        setLikes(likes);
        setComments(comments);
      });
    return () => { active = false; };
  }, [sort]);

  // recent는 즉시 정렬 없이 보여주고, 조회순/좋아요순은 집계가 모두 도착해야 정렬한다.
  // 아직 로딩 중이면 null을 반환해 스켈레톤을 띄운다. 렌더 중에 계산하므로
  // 데이터 도착 순간 곧바로 새 정렬로 바뀌어 이전 목록이 깜빡이지 않는다.
  const displayPosts = useMemo(() => {
    if (sort === "recent") return posts;
    const rankingViews = sort === "weekly" ? weeklyViews : views;
    if (rankingViews && likes && comments) {
      return sortPosts(sort, posts, rankingViews, likes, comments);
    }
    return null;
  }, [sort, posts, views, weeklyViews, likes, comments]);

  return (
    <section className="flex flex-col gap-6">
      <Suspense>
        <SortFromUrl onChange={setSort} />
      </Suspense>
      <div className="flex flex-wrap items-center gap-2">
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
        <PaginatedPosts
          key={sort}
          posts={displayPosts}
          source="home"
          storageKey={`home-feed:${sort}`}
          viewCounts={sort === "weekly" ? weeklyViews ?? undefined : undefined}
          viewLabel={sort === "weekly" ? "최근 7일 조회" : undefined}
        />
      )}
    </section>
  );
}
