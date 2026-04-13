import type { Metadata } from "next";
import { getAllPosts } from "@/lib/mdx";
import { PaginatedPosts } from "@/components/blog/PaginatedPosts";
import { HeroSection } from "@/components/home/HeroSection";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/StaggerChildren";

export const metadata: Metadata = {
  openGraph: {
    title: "Seungwoo Lee",
    description: "개발, 여행, 일상 — 기록하고 싶은 모든 것을 담는 블로그",
    url: "/",
  },
};

export default function Home() {
  const posts = getAllPosts();

  return (
    <StaggerChildren className="flex flex-col gap-16">
      <StaggerItem>
        <HeroSection />
      </StaggerItem>

      <StaggerItem>
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold tracking-tight">최근 글</h2>
          <PaginatedPosts posts={posts} />
        </section>
      </StaggerItem>
    </StaggerChildren>
  );
}
