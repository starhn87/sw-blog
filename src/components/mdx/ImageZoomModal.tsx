"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
  // index는 네비게이션 목표, shownIndex는 화면에 떠 있는(로드가 끝난) 미디어다.
  // 다음 이미지를 다 받은 뒤에 전환하므로 넘기는 순간 빈 프레임이 뜨거나 배경이
  // 비쳐 밝기가 출렁이는 일이 없다.
  const [shownIndex, setShownIndex] = useState(index);
  // 로딩이 짧으면 스피너를 아예 띄우지 않고, 오래 걸릴 때만 부드럽게 드러낸다.
  const [showSpinner, setShowSpinner] = useState(false);

  // 아래로 스와이프(드래그)하면 닫는다. 드래그할수록 이미지·배경이 흐려지고,
  // 임계를 넘으면 손을 떼기 전에도 페이드아웃되며 닫힌다.
  const dragY = useMotionValue(0);
  const imageOpacity = useTransform(dragY, [0, 250], [1, 0]);
  const backdropOpacity = useTransform(dragY, [0, 250], [1, 0.2]);
  // 이미지 위 가로 스와이프로 이전/다음 이동.
  const imgSwipeX = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 모달이 열려 있는 동안 배경 스크롤을 잠근다.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // 목표 index가 바뀌면 그 이미지를 먼저 받아두고, 준비되면 화면을 따라오게 한다.
  useEffect(() => {
    if (index === shownIndex) return;
    const target = media[index];
    if (target?.type !== "image") {
      setShownIndex(index);
      return;
    }
    const img = new Image();
    img.src = target.src;
    if (img.complete && img.naturalWidth > 0) {
      setShownIndex(index);
      return;
    }
    let cancelled = false;
    img.onload = () => {
      if (!cancelled) setShownIndex(index);
    };
    return () => {
      cancelled = true;
    };
  }, [index, shownIndex, media]);

  // 인접 ±2를 미리 받아두면 넘길 때 대부분 즉시 전환된다.
  useEffect(() => {
    [-2, -1, 1, 2].forEach((offset) => {
      const neighbor = media[index + offset];
      if (neighbor?.type === "image") {
        const img = new Image();
        img.src = neighbor.src;
      }
    });
  }, [index, media]);

  // 다음 이미지가 300ms 넘게 안 오면 그때만 스피너를 페이드인한다.
  useEffect(() => {
    if (index === shownIndex) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 300);
    return () => clearTimeout(timer);
  }, [index, shownIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) go(-1);
      else if (e.key === "ArrowRight" && hasNext) go(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const shown = media[shownIndex];
  if (!shown) return null;

  const hasPrev = index > 0;
  const hasNext = index < media.length - 1;

  const go = (dir: -1 | 1) => {
    dragY.set(0);
    onNavigate(dir);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={shown.type === "image" ? shown.alt || "이미지 확대" : "영상 확대"}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <motion.div
        style={{ opacity: backdropOpacity }}
        className="pointer-events-none absolute inset-0 bg-white dark:bg-black"
      />
      <motion.div
        style={{ opacity: imageOpacity }}
        className="pointer-events-none absolute inset-x-4 top-4 z-10 grid grid-cols-[1fr_auto_1fr] items-center"
      >
        <div />
        <div className="pointer-events-auto mx-auto rounded-full bg-black/50 px-4 py-1.5 text-base text-white backdrop-blur-sm">
          {shownIndex + 1} / {media.length}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto ml-auto p-2 text-black transition-opacity hover:opacity-70 dark:text-white sm:p-3"
          aria-label="닫기"
        >
          <X className="size-6 sm:size-9" />
        </button>
      </motion.div>

      {hasPrev && (
        <motion.button
          type="button"
          style={{ opacity: imageOpacity }}
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          className="absolute left-1 top-1/2 z-10 -translate-y-1/2 text-white drop-shadow-lg transition-opacity hover:opacity-70 sm:left-6 sm:text-black sm:drop-shadow-none dark:sm:text-white"
          aria-label="이전"
        >
          <ChevronLeft className="size-8 sm:size-10" />
        </motion.button>
      )}
      {hasNext && (
        <motion.button
          type="button"
          style={{ opacity: imageOpacity }}
          onClick={(e) => { e.stopPropagation(); go(1); }}
          className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-white drop-shadow-lg transition-opacity hover:opacity-70 sm:right-6 sm:text-black sm:drop-shadow-none dark:sm:text-white"
          aria-label="다음"
        >
          <ChevronRight className="size-8 sm:size-10" />
        </motion.button>
      )}

      <motion.div
        style={{ opacity: imageOpacity }}
        className="pointer-events-none relative flex h-[85vh] w-full items-center justify-center sm:w-[90vw]"
      >
        <AnimatePresence>
          {showSpinner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 rounded-full bg-black/40 p-3 backdrop-blur-sm"
            >
              <Loader2 className="size-6 animate-spin text-white" aria-hidden />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {shown.type === "image" ? (
            <motion.img
              key={shown.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, zIndex: 1 }}
              exit={{ opacity: 0, zIndex: 0, transition: { duration: 0.15, delay: 0.3 } }}
              transition={{ duration: 0.3 }}
              drag="y"
              style={{ y: dragY }}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDrag={(_, info) => {
                // 가로 스와이프(좌우 이동)가 우세하면 세로 이동을 취소해 위치가 흔들리지 않게 한다
                if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                  dragY.set(0);
                }
              }}
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
              src={shown.src}
              alt={shown.alt}
              className="pointer-events-auto absolute max-h-full max-w-full cursor-default object-contain"
            />
          ) : (
            <motion.video
              key={shown.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, zIndex: 1 }}
              exit={{ opacity: 0, zIndex: 0, transition: { duration: 0.15, delay: 0.3 } }}
              transition={{ duration: 0.3 }}
              drag="y"
              style={{ y: dragY }}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDrag={(_, info) => {
                if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
                  dragY.set(0);
                }
              }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) {
                  animate(dragY, window.innerHeight, {
                    duration: 0.3,
                    ease: "easeIn",
                    onComplete: onClose,
                  });
                }
              }}
              ref={videoRef}
              onTap={(event) => {
                event.stopPropagation();
                const video = videoRef.current;
                if (!video) return;
                if (video.paused) void video.play();
                else video.pause();
              }}
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
              src={shown.src}
              controls
              autoPlay
              playsInline
              className="pointer-events-auto absolute max-h-full max-w-full cursor-default"
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
