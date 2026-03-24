import { getAllPosts } from "@/lib/mdx";
import { PostCard } from "@/components/blog/PostCard";
import { SearchBar } from "@/components/blog/SearchBar";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/StaggerChildren";

export const metadata = {
  title: "Blog — 이승우의 블로그",
  description: "개발 관련 글 모음",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
      <SearchBar />
      {posts.length === 0 ? (
        <p className="text-muted-foreground">아직 작성된 글이 없습니다.</p>
      ) : (
        <StaggerChildren className="flex flex-col gap-4">
          {posts.map((post) => (
            <StaggerItem key={post.slug}>
              <PostCard post={post} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
