import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — 이승우의 블로그",
  description: "이승우에 대해 소개합니다.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p>안녕하세요, 이승우입니다.</p>
        <p>개발하며 배운 것들을 기록하는 블로그입니다.</p>
      </div>
    </div>
  );
}
