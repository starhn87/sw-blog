"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { isVideo, type MediaItem } from "./types";

export function MediaLightbox({
  items,
  selectedKey,
  onClose,
  onNavigate,
}: {
  items: MediaItem[];
  selectedKey: string | null;
  onClose: () => void;
  onNavigate: (key: string) => void;
}) {
  const currentIndex = selectedKey ? items.findIndex((i) => i.key === selectedKey) : -1;
  const [direction, setDirection] = useState<-1 | 1>(1);

  const navigate = useCallback((dir: -1 | 1) => {
    if (currentIndex === -1) return;
    const next = currentIndex + dir;
    if (next >= 0 && next < items.length) {
      setDirection(dir);
      onNavigate(items[next].key);
    }
  }, [currentIndex, items, onNavigate]);

  useEffect(() => {
    if (!selectedKey) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKey, onClose, navigate]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < items.length - 1;

  const variants = {
    enter: (d: -1 | 1) => ({ x: d * 80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: -1 | 1) => ({ x: d * -80, opacity: 0 }),
  };
  const transition = { x: { type: "spring" as const, stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } };

  return (
    <AnimatePresence>
      {selectedKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/80"
          onClick={onClose}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (e.currentTarget as HTMLElement).dataset.touchX = String(touch.clientX);
          }}
          onTouchEnd={(e) => {
            const startX = Number((e.currentTarget as HTMLElement).dataset.touchX);
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
              if (diff > 0) navigate(1);
              else navigate(-1);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-1/2 -translate-x-1/2 cursor-default rounded-full bg-black/50 px-4 py-1.5 text-base text-white backdrop-blur-sm"
          >
            {currentIndex + 1} / {items.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            aria-label="닫기"
          >
            <X size={20} />
          </button>

          {hasPrev && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 sm:left-6 sm:p-3"
              aria-label="이전"
            >
              <ChevronLeft className="size-5 sm:size-7" />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(1); }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 sm:right-6 sm:p-3"
              aria-label="다음"
            >
              <ChevronRight className="size-5 sm:size-7" />
            </button>
          )}

          <div className="pointer-events-none relative flex h-[85vh] w-[90vw] items-center justify-center">
            <AnimatePresence initial={false} custom={direction}>
              {isVideo(selectedKey) ? (
                <motion.video
                  key={selectedKey}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transition}
                  onClick={(e) => e.stopPropagation()}
                  src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                  poster={`/api/media?key=${encodeURIComponent(`${selectedKey}.poster.jpg`)}`}
                  controls
                  autoPlay
                  className="pointer-events-auto absolute max-h-full max-w-full cursor-default rounded-lg"
                />
              ) : (
                <motion.img
                  key={selectedKey}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transition}
                  onClick={(e) => e.stopPropagation()}
                  src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                  alt={selectedKey}
                  className="pointer-events-auto absolute max-h-full max-w-full cursor-default rounded-lg object-contain"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
