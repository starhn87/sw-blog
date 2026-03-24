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
            <path d="M12.5 10.5c-.8-.6-2-.9-3.2-.7-1.8.3-2.8 1.6-2.6 3.2.2 1.6 1.8 2.3 3.5 2.9 1.7.6 3.3 1.5 3.1 3.5-.2 1.8-1.6 2.9-3.5 2.7-1.3-.1-2.4-.8-3-1.7" className="stroke-background" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M17.5 9l2.2 14 3.2-9 3.2 9L28.3 9" className="stroke-background" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="29" x2="24" y2="3" className="stroke-background" strokeWidth="0.8" opacity="0.5"/>
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
