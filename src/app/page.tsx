import { getAllPosts } from "@/lib/mdx";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { HeroSection } from "@/components/home/HeroSection";

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="flex flex-col gap-16">
      <HeroSection />

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">최근 글</h2>
        <PaginatedPosts posts={posts} />
      </section>
    </div>
  );
}
