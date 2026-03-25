import type { Metadata } from "next";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description: "프론트엔드 개발자 이승우를 소개합니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
