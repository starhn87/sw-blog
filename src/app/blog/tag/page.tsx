import type { Metadata } from "next";
import { Suspense } from "react";
import { getPostSummaries, getAllTags } from "@/lib/mdx";
import { TagArchive } from "@/components/blog/TagArchive";

export const metadata: Metadata = {
  title: "태그",
  description: "태그별 글 모음",
  alternates: { canonical: "/blog/tag" },
};

export default function TagPage() {
  const posts = getPostSummaries();
  const tags = getAllTags();
  return (
    <Suspense>
      <TagArchive posts={posts} allTags={tags} />
    </Suspense>
  );
}
