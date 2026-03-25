import type { Metadata } from "next";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About — 이승우의 블로그",
  description: "프론트엔드 개발자 이승우를 소개합니다.",
};

export default function AboutPage() {
  return <AboutContent />;
}
