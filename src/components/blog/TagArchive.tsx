"use client";

import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { TagCloud } from "@/components/home/TagCloud";
import { ScrollReveal } from "@/components/motion/StaggerChildren";
import type { Post } from "@/types";

export function TagArchive({
  posts,
  allTags,
}: {
  posts: Post[];
  allTags: string[];
}) {
  const name = useSearchParams().get("name") ?? "";
  const filtered = name ? posts.filter((p) => p.tags.includes(name)) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {name ? `#${name}` : "태그"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {name ? `${filtered.length}개의 글` : "태그를 선택하세요"}
        </p>
      </div>
      <TagCloud tags={allTags} activeTag={name} />
      {filtered.length > 0 && (
        <div className="mt-6 md:mt-10 flex flex-col gap-4 md:gap-6">
          {filtered.map((post) => (
            <ScrollReveal key={post.slug}>
              <PostCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
