"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (slugs: string[] | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const debouncedQuery = useDebounce(query, 300);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (searchParams.get("search") === "true") {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!debouncedQuery) {
      onSearch(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<{ results: { slug: string }[] }>)
      .then((data) => {
        onSearch(data.results.map((r) => r.slug));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

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
      {loading && (
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      )}
      {query && !loading && (
        <button onClick={() => setQuery("")}>
          <X size={14} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
