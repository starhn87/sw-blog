"use client";

import { useState } from "react";
import { FileText, SearchX } from "lucide-react";
import { PostCard } from "./PostCard";
import SearchBar from "@/components/blog/SearchBar";
import { ScrollReveal } from "@/components/motion/StaggerChildren";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

export function BlogPostList({
  posts,
  allTags,
}: {
  posts: Post[];
  allTags: string[];
}) {
  const [searchSlugs, setSearchSlugs] = useState<string[] | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tagFiltered = selectedTag
    ? posts.filter((p) => p.tags.includes(selectedTag))
    : posts;

  const filteredPosts =
    searchSlugs === null
      ? tagFiltered
      : searchSlugs
          .map((slug) => tagFiltered.find((p) => p.slug === slug))
          .filter((p): p is Post => Boolean(p));

  return (
    <>
      <SearchBar onSearch={setSearchSlugs} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedTag(null)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selectedTag === null
              ? "bg-foreground text-background"
              : "bg-brand/10 text-foreground/70 hover:bg-brand/20 dark:bg-brand/15",
          )}
        >
          전체
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedTag === tag
                ? "bg-foreground text-background"
                : "bg-brand/10 text-foreground/70 hover:bg-brand/20 dark:bg-brand/15",
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          {searchSlugs === null && selectedTag === null ? (
            <>
              <FileText size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">아직 작성된 글이 없어요.</p>
            </>
          ) : (
            <>
              <SearchX size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">조건에 맞는 글이 없어요.</p>
              <p className="text-sm text-muted-foreground/60">
                다른 검색어나 태그를 선택해 보세요.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:gap-6">
          {filteredPosts.map((post) => (
            <ScrollReveal key={post.slug}>
              <PostCard post={post} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </>
  );
}
