"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/useScrollLock";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const BAR_HEIGHT = 52;

export default function MobileToc() {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const elements = document.querySelectorAll("article h2[id], article h3[id]");
    const items: TocItem[] = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent ?? "",
      level: el.tagName === "H2" ? 2 : 3,
    }));
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight > 0) {
        progress.set(el.scrollTop / scrollHeight);
      }
      setVisible(el.scrollTop > 300);
    };
    // 마운트 시 현재 스크롤 위치를 spring 없이 즉시 반영
    const el = document.documentElement;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      const current = el.scrollTop / scrollHeight;
      progress.set(current);
      scaleX.jump(current);
    }
    setVisible(el.scrollTop > 300);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [progress, scaleX]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const listRef = useRef<HTMLUListElement>(null);
  useScrollLock(listRef, open);

  const scrollToHeading = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    // scrollIntoView 후 offset 보정
    setTimeout(() => {
      const top = el.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT - 16;
      window.scrollTo({ top, behavior: "smooth" });
    }, 250);
  };

  const activeHeading = headings.find((h) => h.id === activeId);

  if (headings.length === 0) return null;

  return (
    <div className="xl:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={dropdownRef}
            initial={{ y: -BAR_HEIGHT, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -BAR_HEIGHT, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="relative flex w-full items-center gap-2.5 border-b border-border bg-background/95 px-4 py-3.5 backdrop-blur-sm"
            >
              {/* Progress fill */}
              <motion.div
                className="absolute inset-0 origin-left bg-gradient-to-r from-brand/25 to-brand/10 dark:from-brand/25 dark:to-brand/10"
                style={{ scaleX }}
              />
              <List size={16} className="relative shrink-0 text-muted-foreground" />
              <span className="relative min-w-0 flex-1 truncate text-left text-sm font-medium">
                {activeHeading?.text || headings[0]?.text}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "relative shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.nav
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border bg-background/95 backdrop-blur-sm"
                  aria-label="목차"
                >
                  <ul ref={listRef} className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-2">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          onClick={(e) => scrollToHeading(e, heading.id)}
                          className={cn(
                            "block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            heading.level === 3 && "pl-7",
                            activeId === heading.id
                              ? "bg-brand/10 font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.nav>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
