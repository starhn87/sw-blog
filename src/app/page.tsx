import Link from "next/link";
import { getAllPosts } from "@/lib/mdx";
import { PostCard } from "@/components/blog/PostCard";

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-4 pt-10">
        <h1 className="text-4xl font-bold tracking-tight">
          안녕하세요, 이승우입니다.
        </h1>
        <p className="text-lg text-muted-foreground">
          개발하며 배운 것들을 기록합니다.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">최근 글</h2>
          <Link
            href="/blog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            모든 글 보기 &rarr;
          </Link>
        </div>
        <div className="flex flex-col gap-4">
          {recentPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
