"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { Post } from "@/types";

export function PopularPosts({ posts }: { posts: Post[] }) {
  const [popular, setPopular] = useState<{ post: Post; count: number }[] | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/views?limit=5")
      .then((r) => r.json() as Promise<{ slug: string; count: number }[]>)
      .then((rows) => {
        const bySlug = new Map(posts.map((p) => [p.slug, p]));
        const matched = rows
          .map((r) => {
            const post = bySlug.get(r.slug);
            return post ? { post, count: r.count } : null;
          })
          .filter((x): x is { post: Post; count: number } => x !== null);
        setPopular(matched);
      })
      .catch(() => {});
  }, [posts]);

  if (!popular || popular.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">인기 글</h2>
      <ol className="flex flex-col">
        {popular.map(({ post, count }, i) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex items-baseline gap-3 border-b border-border py-3 last:border-0"
            >
              <span className="text-sm tabular-nums text-muted-foreground/60">
                {i + 1}
              </span>
              <span className="flex-1 font-medium transition-colors group-hover:text-brand">
                {post.title}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye size={12} />
                {count}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
