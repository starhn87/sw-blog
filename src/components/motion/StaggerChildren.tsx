"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StaggerChildren({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  const Tag = as ? motion[as] : motion.div;

  return (
    <Tag
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: 0.1 },
        },
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
