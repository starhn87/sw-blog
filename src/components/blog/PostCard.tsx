"use client";

import { useEffect, useState } from "react";
import { Heart, Eye, MessageSquare } from "lucide-react";
import type { PostSummary } from "@/types";
import PostThumbnail from "@/components/blog/PostThumbnail";
import { TrackedPostLink } from "@/components/blog/TrackedPostLink";
import type { AnalyticsSource } from "@/lib/analytics";
import { loadPostCounts } from "@/lib/postStats";

export function PostCard({
  post,
  source,
  priority,
  viewCountOverride,
  viewLabel,
}: {
  post: PostSummary;
  source: AnalyticsSource;
  priority?: boolean;
  viewCountOverride?: number;
  viewLabel?: string;
}) {
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadPostCounts("views"), loadPostCounts("likes"), loadPostCounts("comments"),
    ]).then(([views, likes, comments]) => {
      if (!active) return;
      setViewCount(views.get(post.slug) ?? 0);
      setLikeCount(likes.get(post.slug) ?? 0);
      setCommentCount(comments.get(post.slug) ?? 0);
    }).catch(() => {});
    return () => { active = false; };
  }, [post.slug]);
  const displayedViewCount = viewCountOverride ?? viewCount;

  return (
    <article className="group transition-transform duration-300 ease-out hover:-translate-y-1.5">
      <TrackedPostLink slug={post.slug} source={source} className="block">
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
              {displayedViewCount !== null && displayedViewCount > 0 && (
                <>
                  <span>&middot;</span>
                  <span
                    className="flex items-center gap-1"
                    title={viewLabel}
                  >
                    <Eye size={12} />
                    {displayedViewCount}
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
      </TrackedPostLink>
    </article>
  );
}
