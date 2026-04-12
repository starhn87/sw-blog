"use client";

import { useState, useRef, useEffect } from "react";
import { PostCard } from "./PostCard";
import type { Post } from "@/types";

const BATCH = 5;

export function PaginatedPosts({ posts }: { posts: Post[] }) {
  const [visible, setVisible] = useState(BATCH);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible((prev) => Math.min(prev + BATCH, posts.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [posts.length]);

  return (
    <div className="flex flex-col gap-4">
      {posts.slice(0, visible).map((post, i) => (
        <div
          key={post.slug}
          style={
            i >= visible - BATCH
              ? {
                  animation: "fade-in-up 0.3s ease-out both",
                  animationDelay: `${(i % BATCH) * 60}ms`,
                }
              : undefined
          }
        >
          <PostCard post={post} priority={i === 0} />
        </div>
      ))}
      {visible < posts.length && <div ref={loaderRef} className="h-1" />}
    </div>
  );
}
