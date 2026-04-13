import { Suspense } from "react";
import { getAllPosts } from "@/lib/mdx";
import { BlogPostList } from "@/components/blog/BlogPostList";

export const metadata = {
  title: "Blog",
  description: "개발, 여행, 일상 — 기록하고 싶은 모든 것",
  openGraph: {
    title: "Blog — Seungwoo Lee",
    description: "개발, 여행, 일상 — 기록하고 싶은 모든 것",
    url: "/blog",
  },
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <Suspense>
        <BlogPostList posts={posts} />
      </Suspense>
    </div>
  );
}
