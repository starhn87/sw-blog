"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
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
        <motion.div
          key={post.slug}
          initial={i >= visible - BATCH ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: (i % BATCH) * 0.06 }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
      {visible < posts.length && <div ref={loaderRef} className="h-1" />}
    </div>
  );
}
