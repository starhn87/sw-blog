"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Eye } from "lucide-react";
import type { Post } from "@/types";
import { canOptimize, getImageSrcSet, getOptimizedImageUrl } from "@/lib/image";

export function PostCard({ post, priority }: { post: Post; priority?: boolean }) {
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/likes?slug=${post.slug}`).then((r) => r.json()),
      fetch(`/api/views?slug=${post.slug}`).then((r) => r.json()),
    ])
      .then(([likesData, viewsData]) => {
        setLikeCount((likesData as { count: number }).count);
        setViewCount((viewsData as { count: number }).count);
      })
      .catch(() => {});
  }, [post.slug]);

  return (
    <article className="group transition-transform duration-300 ease-out hover:-translate-y-1.5">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="overflow-hidden rounded-lg border border-border transition-all duration-300 group-hover:border-brand/30 group-hover:bg-accent/50 group-hover:shadow-lg group-hover:shadow-brand/5">
          {post.thumbnail && (
            <img
              src={
                canOptimize(post.thumbnail)
                  ? getOptimizedImageUrl(post.thumbnail, 800)
                  : post.thumbnail
              }
              srcSet={getImageSrcSet(post.thumbnail)}
              sizes="(min-width: 768px) 50vw, 100vw"
              alt={post.title}
              className="aspect-[21/9] w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              {...(priority ? { fetchPriority: "high" as const } : {})}
            />
          )}
          <div className="p-6">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
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
