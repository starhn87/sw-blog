"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.span
          className="text-8xl font-bold text-brand/20"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          404
        </motion.span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
          <p className="text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었어요.
          </p>
        </div>
        <div className="mt-2 flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Home size={16} />
            홈으로
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ArrowLeft size={16} />
            블로그
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
