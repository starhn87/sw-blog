"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Post } from "@/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="rounded-lg border border-border p-6 transition-colors group-hover:border-foreground/20 group-hover:bg-accent/50">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>&middot;</span>
            <span>{post.readingTime}</span>
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
      </Link>
    </motion.article>
  );
}
