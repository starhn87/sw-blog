"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Eye } from "lucide-react";
import { motion } from "framer-motion";
import type { Post } from "@/types";

export function PostCard({ post }: { post: Post }) {
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
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="overflow-hidden rounded-lg border border-border transition-colors group-hover:border-foreground/20 group-hover:bg-accent/50">
          {post.thumbnail && (
            <img
              src={post.thumbnail}
              alt={post.title}
              className="aspect-[21/9] w-full object-cover"
              loading="lazy"
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
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
