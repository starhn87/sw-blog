import type { Metadata } from "next";
import { AboutContent } from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description: "프론트엔드 개발자 이승우를 소개합니다.",
  openGraph: {
    title: "About — Seungwoo Lee",
    description: "프론트엔드 개발자 이승우를 소개합니다.",
    url: "/about",
  },
  alternates: {
    canonical: "/about",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "이승우",
  alternateName: "Seungwoo Lee",
  url: "https://www.seung-woo.me/about",
  image: "https://www.seung-woo.me/og-default.png",
  jobTitle: "Frontend Engineer",
  description:
    "성능과 UX에 진심인 프론트엔드 개발자. 글로벌 서비스부터 0 to 1 프로덕트까지 6년간 다양한 환경에서 프로덕트를 만들어왔습니다.",
  email: "mailto:starhn87@gmail.com",
  sameAs: [
    "https://github.com/starhn87",
    "https://www.linkedin.com/in/seungwoo-lee-279897257/",
    "https://www.notion.so/Jimmy-d0f1d7dec7b247e58947d2bcd4f58dab",
  ],
  knowsAbout: [
    "Frontend Development",
    "React",
    "Next.js",
    "TypeScript",
    "Web Performance",
    "User Experience",
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <AboutContent />
    </>
  );
}
