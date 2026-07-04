"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { ZoomMedia } from "@/hooks/useImageZoom";

export default function ImageZoomModal({
  media,
  index,
  onClose,
  onNavigate,
}: {
  media: ZoomMedia[];
  index: number;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
}) {
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [loaded, setLoaded] = useState(false);
  const current = media[index];

  // 이미지를 아래로 스와이프(드래그)하면 닫는다. 드래그할수록 이미지·배경이 흐려지고,
  // 임계를 넘으면 손을 떼기 전에도 페이드아웃되며 닫힌다.
  const dragY = useMotionValue(0);
  const imageOpacity = useTransform(dragY, [0, 250], [1, 0]);
  // 배경(이미지 밖)은 스와이프엔 반응하지 않고, 탭했을 때만 닫는다.
  const bgPointerDown = useRef<{ x: number; y: number } | null>(null);
  // 이미지 위 가로 스와이프로 이전/다음 이동.
  const imgSwipeX = useRef(0);
  const backdropColor = useTransform(
    dragY,
    [0, 250],
    ["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.2)"],
  );

  // 모달이 열려 있는 동안 배경 스크롤을 잠근다.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setLoaded(false);
    if (current?.type !== "image") return;
    // If the browser already has it cached (pointerdown prefetch hit), skip the spinner
    const probe = new Image();
    probe.src = current.src;
    if (probe.complete && probe.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [current]);

  useEffect(() => {
    // Prefetch ±2 neighbors so nav buttons feel instant
    [-2, -1, 1, 2].forEach((offset) => {
      const neighbor = media[index + offset];
      if (neighbor?.type === "image") {
        const img = new Image();
        img.src = neighbor.src;
      }
    });
  }, [index, media]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) go(-1);
      else if (e.key === "ArrowRight" && hasNext) go(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!current) return null;

  const hasPrev = index > 0;
  const hasNext = index < media.length - 1;

  const go = (dir: -1 | 1) => {
    setDirection(dir);
    onNavigate(dir);
  };

  const variants = {
    enter: (d: -1 | 1) => ({ x: d * 80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: -1 | 1) => ({ x: d * -80, opacity: 0 }),
  };
  const transition = { x: { type: "spring" as const, stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={current.type === "image" ? current.alt || "이미지 확대" : "영상 확대"}
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center"
      style={{ backgroundColor: backdropColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onPointerDown={(e) => {
        bgPointerDown.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const p = bgPointerDown.current;
        if (p && Math.abs(e.clientX - p.x) < 10 && Math.abs(e.clientY - p.y) < 10) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-1/2 -translate-x-1/2 cursor-default rounded-full bg-black/50 px-4 py-1.5 text-base text-white backdrop-blur-sm"
      >
        {index + 1} / {media.length}
      </div>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 sm:left-6 sm:p-3"
          aria-label="이전"
        >
          <ChevronLeft className="size-5 sm:size-7" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 sm:right-6 sm:p-3"
          aria-label="다음"
        >
          <ChevronRight className="size-5 sm:size-7" />
        </button>
      )}

      <div className="pointer-events-none relative flex h-[85vh] w-[90vw] items-center justify-center">
        {!loaded && current.type === "image" && (
          <Loader2 className="absolute size-10 animate-spin text-white/70" aria-hidden />
        )}
        <AnimatePresence initial={false} custom={direction}>
          {current.type === "image" ? (
            <motion.img
              key={current.src}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag="y"
              style={{ y: dragY, opacity: imageOpacity }}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) {
                  // 드래그 방향(아래)으로 마저 날리며 페이드아웃한 뒤 닫는다
                  animate(dragY, window.innerHeight, {
                    duration: 0.3,
                    ease: "easeIn",
                    onComplete: onClose,
                  });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                imgSwipeX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const diff = imgSwipeX.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                  if (diff > 0 && hasNext) go(1);
                  else if (diff < 0 && hasPrev) go(-1);
                }
              }}
              onLoad={() => setLoaded(true)}
              src={current.src}
              alt={current.alt}
              className="pointer-events-auto absolute max-h-full max-w-full cursor-default rounded-lg object-contain"
            />
          ) : (
            <motion.video
              key={current.src}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              onClick={(e) => e.stopPropagation()}
              src={current.src}
              controls
              autoPlay
              playsInline
              className="pointer-events-auto absolute max-h-full max-w-full cursor-default rounded-lg"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
