import type { Metadata } from "next";
import { getAllPosts, getAllTags } from "@/lib/mdx";
import { HomePostFeed } from "@/components/home/HomePostFeed";
import { TagCloud } from "@/components/home/TagCloud";
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
        <TagCloud tags={tags} title="태그" />
      </StaggerItem>

      <StaggerItem>
        <HomePostFeed posts={posts} />
      </StaggerItem>
    </StaggerChildren>
  );
}
