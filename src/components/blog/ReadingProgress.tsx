"use client";

import { useEffect } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export default function ReadingProgress() {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleScroll = () => {
      const prose = document.querySelector<HTMLElement>(".prose");
      if (!prose) return;
      const start = prose.getBoundingClientRect().top + window.scrollY;
      const range = prose.offsetHeight - window.innerHeight;
      if (range <= 0) {
        progress.set(1);
        return;
      }
      progress.set(Math.max(0, Math.min(1, (window.scrollY - start) / range)));
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
