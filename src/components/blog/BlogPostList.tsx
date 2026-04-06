"use client";

import { useState } from "react";
import { PostCard } from "./PostCard";
import { SearchBar } from "./SearchBar";
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
        <p className="text-muted-foreground">
          {searchSlugs === null
            ? "아직 작성된 글이 없습니다."
            : "검색 결과가 없습니다."}
        </p>
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
