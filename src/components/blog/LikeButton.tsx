"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLikeToggle } from "@/hooks/useLikeToggle";

export function LikeButton({ slug }: { slug: string }) {
  const body = useMemo(() => ({ slug }), [slug]);
  const { count, liked, toggle } = useLikeToggle(
    `/api/likes?slug=${slug}`,
    "/api/likes",
    body,
  );

  return (
    <button
      onClick={toggle}
      aria-label={`좋아요 ${count}`}
      aria-pressed={liked}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <Heart
        size={16}
        className={cn(
          "transition-colors",
          liked ? "fill-red-500 text-red-500" : "text-muted-foreground",
        )}
      />
      <span>{count}</span>
    </button>
  );
}
