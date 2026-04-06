"use client";

import { useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export function ReadingProgress() {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight > 0) {
        progress.set(el.scrollTop / scrollHeight);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [progress]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-[3px] origin-left bg-brand will-change-transform"
      style={{ scaleX }}
    />
  );
}
