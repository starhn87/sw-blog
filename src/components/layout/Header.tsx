"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/useIsMobile";

export function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();

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
          <Image src="/icon.png" width={isMobile ? 32 : 48} height={isMobile ? 32 : 48} alt="SW Blog" className="rounded-[5px]" />
          <span className="hidden sm:inline text-xl">SW Blog</span>
        </Link>
        <div className="flex items-center gap-4">
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
