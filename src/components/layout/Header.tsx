"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur transition-all duration-300 ${
        scrolled
          ? "border-border bg-background/80 shadow-sm"
          : "border-transparent bg-background/60"
      }`}
    >
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="rounded-[5px]">
            <rect width="32" height="32" rx="10" className="fill-foreground" />
            <path d="M13 11c-1-.8-2.2-1.2-3.5-1-2 .3-3 1.8-2.8 3.5.2 1.8 2 2.5 3.8 3.2 1.8.7 3.6 1.6 3.4 3.8-.2 2-1.8 3.2-3.8 3-1.5-.2-2.8-1-3.4-2" className="stroke-background" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M18.5 9.5l2.2 13 3-8.5 3 8.5 2.2-13" className="stroke-background" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">SW Blog</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
          <Link
            href="/about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <button
            onClick={() => router.push("/blog?search=true")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="검색"
          >
            <Search size={18} />
          </button>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
