"use client";

import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLikeToggle } from "@/hooks/useLikeToggle";

function RollingNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute text-xs leading-none"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function CommentLikeButton({
  commentId,
  initialCount,
  initialLiked,
}: {
  commentId: number;
  initialCount: number;
  initialLiked: boolean;
}) {
  const { count, liked, toggle } = useLikeToggle(
    null,
    "/api/comments/likes",
    { commentId },
    { count: initialCount, liked: initialLiked },
  );

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="좋아요"
    >
      <motion.span
        animate={
          liked
            ? { scale: [1, 1.4, 0.9, 1.1, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="inline-flex items-center"
      >
        <Heart
          size={14}
          className={cn(
            "transition-colors duration-300",
            liked && "fill-red-500 text-red-500",
          )}
        />
      </motion.span>
      {count > 0 && <RollingNumber value={count} />}
    </motion.button>
  );
}
