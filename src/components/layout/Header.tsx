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
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-sm transition-all duration-300 ${
        scrolled
          ? "border-border bg-background/80 shadow-xs"
          : "border-transparent bg-background/60"
      }`}
    >
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <img src="/logo.svg" alt="SW Blog" className="size-12 sm:size-16" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <button
            onClick={() => router.push("/blog?search=true")}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="검색"
          >
            <Search className="size-[18px] sm:size-5" />
          </button>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
