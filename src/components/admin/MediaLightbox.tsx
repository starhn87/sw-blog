"use client";

import { useEffect, useCallback } from "react";
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

  const navigate = useCallback((dir: -1 | 1) => {
    if (currentIndex === -1) return;
    const next = currentIndex + dir;
    if (next >= 0 && next < items.length) onNavigate(items[next].key);
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

  return (
    <AnimatePresence>
      {selectedKey && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
          <div
            className="relative flex items-center justify-center sm:gap-6"
            onClick={(e) => e.stopPropagation()}
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
            {currentIndex > 0 ? (
              <button
                onClick={() => navigate(-1)}
                className="hidden shrink-0 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/40 sm:block"
                aria-label="이전"
              >
                <ChevronLeft size={28} />
              </button>
            ) : (
              <div className="hidden w-[52px] shrink-0 sm:block" />
            )}
            {isVideo(selectedKey) ? (
              <motion.video
                key={selectedKey}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] rounded-lg sm:max-w-[85vw]"
              />
            ) : (
              <motion.img
                key={selectedKey}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                alt={selectedKey}
                className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain sm:max-w-[85vw]"
              />
            )}
            {currentIndex < items.length - 1 ? (
              <button
                onClick={() => navigate(1)}
                className="hidden shrink-0 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/40 sm:block"
                aria-label="다음"
              >
                <ChevronRight size={28} />
              </button>
            ) : (
              <div className="hidden w-[52px] shrink-0 sm:block" />
            )}
            {currentIndex > 0 && (
              <button
                onClick={() => navigate(-1)}
                className="absolute left-2 rounded-full bg-black/40 p-1.5 text-white sm:hidden"
                aria-label="이전"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {currentIndex < items.length - 1 && (
              <button
                onClick={() => navigate(1)}
                className="absolute right-2 rounded-full bg-black/40 p-1.5 text-white sm:hidden"
                aria-label="다음"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
