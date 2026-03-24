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
            <path d="M13 9.5c-1-.7-2.5-1-4-1-2.5 0-4 1.5-4 3.5s1.5 3 4 3.5c2.5.5 4 1.5 4 3.5s-1.5 3.5-4 3.5c-1.5 0-3-.3-4-1" className="stroke-background" strokeWidth="1"/>
            <path d="M17 8l3 16 3.5-11L27 24l3-16" className="stroke-background" strokeWidth="1" strokeLinejoin="bevel"/>
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
