"use client";

import { motion } from "framer-motion";
import { useReadingProgress } from "@/hooks/useReadingProgress";

export default function ReadingProgress() {
  const scaleX = useReadingProgress();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-[3px] origin-left bg-brand will-change-transform"
      style={{ scaleX }}
    />
  );
}
