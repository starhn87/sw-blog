import { getAllPosts } from "@/lib/mdx";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { FadeIn } from "@/components/motion/FadeIn";

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-16">
      <FadeIn className="flex flex-col gap-4 pt-10">
        <h1 className="text-4xl font-bold tracking-tight">
          안녕하세요, 이승우입니다.
        </h1>
        <p className="text-lg text-muted-foreground">
          기록하고 싶은 모든 것을 담습니다.
        </p>
      </FadeIn>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">최근 글</h2>
        <PaginatedPosts posts={posts} />
      </section>
    </div>
  );
}
