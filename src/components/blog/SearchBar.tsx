"use client";

import { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
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

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

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
      setResults([]);
      return;
    }
    const found = fuse.search(debouncedQuery, { limit: 5 });
    setResults(found.map((r) => r.item));
  }, [fuse, debouncedQuery]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="검색..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-2 rounded-lg border border-border bg-background shadow-lg">
          {results.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/blog/${item.slug}`}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="block px-4 py-3 transition-colors hover:bg-accent"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
