import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/mdx";
import { HomePostFeed } from "@/components/home/HomePostFeed";
import { HeroSection } from "@/components/home/HeroSection";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/StaggerChildren";

export const metadata: Metadata = {
  openGraph: {
    title: "Seungwoo Lee",
    description: "개발, 여행, 일상 - 기록하고 싶은 모든 것을 담는 블로그",
    url: "/",
  },
};

export default function Home() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <StaggerChildren className="flex flex-col gap-16">
      <StaggerItem>
        <HeroSection />
      </StaggerItem>

      <StaggerItem>
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">태그</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog/tag/${encodeURIComponent(tag)}`}
                className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-foreground/70 transition-colors hover:bg-brand/20 dark:bg-brand/15 dark:hover:bg-brand/25"
              >
                {tag}
              </Link>
            ))}
          </div>
        </section>
      </StaggerItem>

      <StaggerItem>
        <HomePostFeed posts={posts} />
      </StaggerItem>
    </StaggerChildren>
  );
}
