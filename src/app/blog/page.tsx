import { getAllPosts } from "@/lib/mdx";
import { BlogPostList } from "@/components/blog/BlogPostList";

export const metadata = {
  title: "Blog — 이승우의 블로그",
  description: "개발 관련 글 모음",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <BlogPostList posts={posts} />
    </div>
  );
}
