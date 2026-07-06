"use client";

import { cn } from "@/lib/utils";
import { useTableOfContents } from "@/hooks/useTableOfContents";

export default function TableOfContents() {
  const { headings, activeId } = useTableOfContents();

  if (headings.length === 0) return null;

  return (
    <nav aria-labelledby="toc-heading">
      <div className="fixed top-32 w-56">
        <p id="toc-heading" className="mb-3 text-sm font-semibold">
          목차
        </p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block transition-colors hover:text-foreground",
                  heading.level === 3 && "pl-4",
                  activeId === heading.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
