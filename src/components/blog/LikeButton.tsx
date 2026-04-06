"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLikeToggle } from "@/hooks/useLikeToggle";

function HeartParticle({ index }: { index: number }) {
  const angle = (index / 6) * 360;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * 20;
  const y = Math.sin(rad) * 20;

  return (
    <motion.span
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, scale: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="pointer-events-none absolute left-1/2 top-1/2 text-red-400"
      style={{ fontSize: "10px" }}
    >
      ♥
    </motion.span>
  );
}

export function LikeButton({ slug }: { slug: string }) {
  const { count, liked, toggle } = useLikeToggle(
    `/api/likes?slug=${slug}`,
    "/api/likes",
    { slug },
  );
  const [particles, setParticles] = useState<number[]>([]);

  const handleClick = () => {
    toggle();
    if (!liked) {
      setParticles((prev) => [...prev, Date.now()]);
      setTimeout(() => setParticles((prev) => prev.slice(1)), 700);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`좋아요 ${count}`}
      aria-pressed={liked}
      className="relative flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <span className="relative inline-flex items-center">
        <motion.span
          animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center"
        >
          <Heart
            size={16}
            className={cn(
              "transition-colors",
              liked ? "fill-red-500 text-red-500" : "text-muted-foreground",
            )}
          />
        </motion.span>
        <AnimatePresence>
          {particles.map((id) =>
            Array.from({ length: 6 }, (_, i) => (
              <HeartParticle key={`${id}-${i}`} index={i} />
            ))
          )}
        </AnimatePresence>
      </span>
      <span>{count}</span>
    </button>
  );
}
