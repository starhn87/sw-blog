"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// 약 2줄 높이(px). 칩 한 줄 ≈ 28px + 줄 간격 8px.
const COLLAPSED_MAX_H = 64;

export function TagCloud({
  tags,
  activeTag,
  title,
}: {
  tags: string[];
  activeTag?: string;
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setOverflows(ref.current.scrollHeight > COLLAPSED_MAX_H + 4);
    }
  }, [tags]);

  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      )}
      <div
        ref={ref}
        className="flex flex-wrap gap-2 overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{
          maxHeight: expanded
            ? `${ref.current?.scrollHeight ?? 9999}px`
            : `${COLLAPSED_MAX_H}px`,
        }}
      >
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/blog/tag/${encodeURIComponent(tag)}`}
            aria-current={tag === activeTag ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              tag === activeTag
                ? "bg-foreground text-background"
                : "bg-brand/10 text-foreground/70 hover:bg-brand/20 dark:bg-brand/15 dark:hover:bg-brand/25",
            )}
          >
            {tag}
          </Link>
        ))}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-1 self-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? "접기" : "전체 보기"}
          <ChevronDown
            size={16}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </button>
      )}
    </section>
  );
}
