"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PostCard } from "./PostCard";
import type { Post } from "@/types";
import { cn } from "@/lib/utils";

const PER_PAGE = 5;

export function PaginatedPosts({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(posts.length / PER_PAGE);
  const current = posts.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {current.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </motion.div>
      </AnimatePresence>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="이전 페이지"
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={cn(
                "rounded-lg px-3 py-1 text-sm transition-colors",
                i === page
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages - 1}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            aria-label="다음 페이지"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
