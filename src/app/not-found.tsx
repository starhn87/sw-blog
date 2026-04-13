import type { Metadata } from "next";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div
        className="flex flex-col items-center gap-6"
        style={{ animation: "fade-in-up 0.5s ease-out both" }}
      >
        <span className="text-8xl font-bold text-brand/20">404</span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
          <p className="text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었어요.
          </p>
        </div>
        <div className="mt-2 flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Home size={16} />
            홈으로
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ArrowLeft size={16} />
            블로그
          </Link>
        </div>
      </div>
    </div>
  );
}
