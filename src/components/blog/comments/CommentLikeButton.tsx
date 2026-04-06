"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLikeToggle } from "@/hooks/useLikeToggle";

export function CommentLikeButton({ commentId }: { commentId: number }) {
  const { count, liked, toggle } = useLikeToggle(
    `/api/comments/likes?commentId=${commentId}`,
    "/api/comments/likes",
    { commentId },
  );

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="좋아요"
    >
      <motion.span
        animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="inline-flex"
      >
        <Heart
          size={14}
          className={cn(
            "transition-colors",
            liked && "fill-red-500 text-red-500",
          )}
        />
      </motion.span>
      {count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
}
