"use client";

import { useState } from "react";
import { FileText, SearchX } from "lucide-react";
import { PostCard } from "./PostCard";
import SearchBar from "@/components/blog/SearchBar";
import { ScrollReveal } from "@/components/motion/StaggerChildren";
import type { Post } from "@/types";

export function BlogPostList({ posts }: { posts: Post[] }) {
  const [searchSlugs, setSearchSlugs] = useState<string[] | null>(null);

  const handleSearch = (slugs: string[] | null) => {
    setSearchSlugs(slugs);
  };

  const filteredPosts =
    searchSlugs === null
      ? posts
      : searchSlugs.map((slug) => posts.find((p) => p.slug === slug)!).filter(Boolean);

  return (
    <>
      <SearchBar onSearch={handleSearch} />
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          {searchSlugs === null ? (
            <>
              <FileText size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">아직 작성된 글이 없어요.</p>
            </>
          ) : (
            <>
              <SearchX size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">검색 결과가 없어요.</p>
              <p className="text-sm text-muted-foreground/60">다른 키워드로 검색해 보세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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
