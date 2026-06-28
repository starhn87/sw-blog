import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllPosts, getAllTags } from "@/lib/mdx";
import { TagArchive } from "@/components/blog/TagArchive";

export const metadata: Metadata = {
  title: "태그",
  description: "태그별 글 모음",
  alternates: { canonical: "/blog/tag" },
};

export default function TagPage() {
  const posts = getAllPosts().map((p) => ({ ...p, content: "" }));
  const tags = getAllTags();
  return (
    <Suspense>
      <TagArchive posts={posts} allTags={tags} />
    </Suspense>
  );
}
