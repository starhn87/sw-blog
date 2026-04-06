"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  content: string;
}

export function SearchBar({
  onSearch,
}: {
  onSearch: (slugs: string[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (searchParams.get("search") === "true") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/search-index.json")
      .then((res) => res.json())
      .then((data) => {
        const items = data as SearchItem[];
        setFuse(
          new Fuse(items, {
            keys: ["title", "description", "tags", "content"],
            threshold: 0.3,
          }),
        );
      });
  }, []);

  useEffect(() => {
    if (!fuse || !debouncedQuery) {
      onSearch(null);
      return;
    }
    const found = fuse.search(debouncedQuery);
    onSearch(found.map((r) => r.item.slug));
  }, [fuse, debouncedQuery]);

  return (
    <div
      ref={wrapperRef}
      className={`flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 ${focused ? "search-focused" : ""}`}
    >
      <Search size={16} className={`transition-colors duration-300 ${focused ? "text-brand" : "text-muted-foreground"}`} aria-hidden="true" />
      <label className="flex-1">
        <span className="sr-only">블로그 검색</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-no-brand
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-base outline-hidden placeholder:text-muted-foreground"
        />
      </label>
      {query && (
        <button onClick={() => setQuery("")}>
          <X size={14} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
