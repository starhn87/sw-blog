"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Eye, MessageSquare } from "lucide-react";
import type { Post } from "@/types";
import PostThumbnail from "@/components/blog/PostThumbnail";

type CountMap = Map<string, number>;

// 목록의 모든 카드가 공유하는 집계 통계. slug별 개별 호출(N+1) 대신
// 글별 집계 API를 세션당 한 번만 불러 카드끼리 재사용한다.
let statsPromise: Promise<{
  views: CountMap;
  likes: CountMap;
  comments: CountMap;
}> | null = null;

function loadStats() {
  if (!statsPromise) {
    const toMap = (rows: { slug: string; count: number }[]) =>
      new Map(rows.map((r) => [r.slug, r.count]));
    const json = (url: string) =>
      fetch(url).then(
        (r) => r.json() as Promise<{ slug: string; count: number }[]>,
      );
    statsPromise = Promise.all([
      json("/api/views"),
      json("/api/likes"),
      json("/api/comments"),
    ])
      .then(([v, l, c]) => ({
        views: toMap(v),
        likes: toMap(l),
        comments: toMap(c),
      }))
      .catch(() => ({
        views: new Map<string, number>(),
        likes: new Map<string, number>(),
        comments: new Map<string, number>(),
      }));
  }
  return statsPromise;
}

export function PostCard({ post, priority }: { post: Post; priority?: boolean }) {
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    loadStats().then(({ views, likes, comments }) => {
      setViewCount(views.get(post.slug) ?? 0);
      setLikeCount(likes.get(post.slug) ?? 0);
      setCommentCount(comments.get(post.slug) ?? 0);
    });
  }, [post.slug]);

  return (
    <article className="group transition-transform duration-300 ease-out hover:-translate-y-1.5">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="overflow-hidden rounded-lg border border-border transition-all duration-300 group-hover:border-brand/30 group-hover:bg-accent/50 group-hover:shadow-lg group-hover:shadow-brand/5">
          {post.thumbnail && (
            <PostThumbnail
              src={post.thumbnail}
              alt={post.title}
              width={800}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[21/9] w-full border-b border-border object-cover"
              priority={priority}
            />
          )}
          <div className="p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "Asia/Seoul",
                })}
              </time>
              {viewCount !== null && viewCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {viewCount}
                  </span>
                </>
              )}
              {likeCount !== null && likeCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="fill-red-500 text-red-500" />
                    {likeCount}
                  </span>
                </>
              )}
              {commentCount !== null && commentCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {commentCount}
                  </span>
                </>
              )}
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {post.title}
            </h2>
            <p className="mb-4 text-muted-foreground">{post.description}</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-foreground/70 dark:bg-brand/15"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
