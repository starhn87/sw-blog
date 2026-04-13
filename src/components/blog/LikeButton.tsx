"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLikeToggle } from "@/hooks/useLikeToggle";

const PARTICLE_COUNT = 12;

const PARTICLE_COLORS = [
  "#ef4444", // red-500
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#f472b6", // pink-400
  "#c084fc", // purple-400
  "#fbbf24", // amber-400
];

function Particle({ index }: { index: number }) {
  const angle = (index / PARTICLE_COUNT) * 360 + (Math.random() - 0.5) * 30;
  const rad = (angle * Math.PI) / 180;
  const distance = 24 + Math.random() * 16;
  const x = Math.cos(rad) * distance;
  const y = Math.sin(rad) * distance;
  const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
  const size = 3 + Math.random() * 3;

  return (
    <motion.span
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x, y, scale: 0 }}
      transition={{ duration: 0.5 + Math.random() * 0.3, ease: "easeOut" }}
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  );
}

function RingEffect() {
  return (
    <motion.span
      initial={{ opacity: 0.6, scale: 0.5 }}
      animate={{ opacity: 0, scale: 2.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-400"
      style={{ width: 20, height: 20 }}
    />
  );
}

function RollingNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-5 w-6 items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="absolute"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function LikeButton({ slug }: { slug: string }) {
  const { count, liked, toggle } = useLikeToggle(
    `/api/likes?slug=${slug}`,
    "/api/likes",
    { slug },
  );
  const [bursts, setBursts] = useState<number[]>([]);

  const handleClick = () => {
    toggle();
    if (!liked) {
      setBursts((prev) => [...prev, Date.now()]);
      setTimeout(() => setBursts((prev) => prev.slice(1)), 900);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`좋아요 ${count}`}
      aria-pressed={liked}
      className="relative flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <span className="relative inline-flex items-center">
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
            size={16}
            className={cn(
              "transition-colors duration-300",
              liked ? "fill-red-500 text-red-500" : "text-muted-foreground",
            )}
          />
        </motion.span>
        <AnimatePresence>
          {bursts.map((id) => (
            <span key={id}>
              <RingEffect />
              {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
                <Particle key={`${id}-${i}`} index={i} />
              ))}
            </span>
          ))}
        </AnimatePresence>
      </span>
      <RollingNumber value={count} />
    </motion.button>
  );
}
