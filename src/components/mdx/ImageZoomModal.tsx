"use client";

import {
  useEffect,
  useRef,
  useState,
  type TouchEvent,
  type TouchList,
} from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import type { ZoomMedia } from "@/hooks/useImageZoom";

const MAX_SCALE = 4;

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
  // index는 네비게이션 목표, current는 화면에 떠 있는(로드가 끝난) 미디어다. 다음
  // 이미지를 다 받은 뒤 슬라이드로 전환하므로 넘기는 순간 빈 프레임이 없다.
  // (Escape·방향키·배경 스크롤 잠금은 useImageZoom이 담당한다.)
  const [current, setCurrent] = useState(index);
  const [direction, setDirection] = useState<-1 | 1>(1);
  // 로딩이 짧으면 스피너를 아예 띄우지 않고, 오래 걸릴 때만 부드럽게 드러낸다.
  const [showSpinner, setShowSpinner] = useState(false);
  // 핀치로 확대 중인지. 확대 상태에선 슬라이드·닫기 제스처를 끄고 팬만 남긴다.
  const [zoomed, setZoomed] = useState(false);

  // 아래로 스와이프(드래그)하면 닫는다. 드래그할수록 이미지·배경이 흐려지고,
  // 임계를 넘으면 손을 떼기 전에도 페이드아웃되며 닫힌다.
  const dragY = useMotionValue(0);
  const imageOpacity = useTransform(dragY, [0, 250], [1, 0]);
  const backdropOpacity = useTransform(dragY, [0, 250], [1, 0.2]);
  // 이미지 위 가로 스와이프로 이전/다음 이동.
  const swipeStartX = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 두 손가락 핀치 확대 + 확대 상태에서의 한 손가락 팬.
  const scale = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const gesture = useRef({
    mode: "none" as "none" | "pinch" | "pan" | "swipe",
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // 목표 index가 바뀌면 그 이미지를 먼저 받아두고, 준비되면 슬라이드 방향을 정한 뒤
  // current를 옮긴다.
  useEffect(() => {
    if (index === current) return;
    const dir: -1 | 1 = index > current ? 1 : -1;
    const target = media[index];
    const advance = () => {
      setDirection(dir);
      setCurrent(index);
    };
    if (target?.type !== "image") {
      advance();
      return;
    }
    const img = new Image();
    if (target.srcSet) {
      img.srcset = target.srcSet;
      img.sizes = "100vw";
    }
    img.src = target.src;
    if (img.complete && img.naturalWidth > 0) {
      advance();
      return;
    }
    let cancelled = false;
    img.onload = () => {
      if (!cancelled) advance();
    };
    return () => {
      cancelled = true;
    };
  }, [index, current, media]);

  // 인접 ±2를 미리 받아두면 넘길 때 대부분 즉시 전환된다.
  useEffect(() => {
    [-2, -1, 1, 2].forEach((offset) => {
      const neighbor = media[index + offset];
      if (neighbor?.type === "image") {
        const img = new Image();
        if (neighbor.srcSet) {
          img.srcset = neighbor.srcSet;
          img.sizes = "100vw";
        }
        img.src = neighbor.src;
      }
    });
  }, [index, media]);

  // 다음 이미지가 300ms 넘게 안 오면 그때만 스피너를 페이드인한다.
  useEffect(() => {
    if (index === current) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 300);
    return () => clearTimeout(timer);
  }, [index, current]);

  // 다른 이미지로 넘어가면 확대 상태를 초기화한다.
  useEffect(() => {
    scale.set(1);
    panX.set(0);
    panY.set(0);
    setZoomed(false);
  }, [current, scale, panX, panY]);

  const shown = media[current];
  if (!shown) return null;

  const hasPrev = index > 0;
  const hasNext = index < media.length - 1;

  const go = (dir: -1 | 1) => {
    dragY.set(0);
    onNavigate(dir);
  };

  const resetZoom = () => {
    animate(scale, 1, { duration: 0.2 });
    animate(panX, 0, { duration: 0.2 });
    animate(panY, 0, { duration: 0.2 });
    setZoomed(false);
  };

  // 더블탭/더블클릭으로 확대·원복을 토글한다.
  const toggleZoom = () => {
    if (scale.get() > 1) {
      resetZoom();
    } else {
      animate(scale, 2.4, { duration: 0.2 });
      setZoomed(true);
    }
  };

  // 세로 드래그로 닫기. 가로 이동이 우세하면 취소해 흔들리지 않게 하고, 임계를 넘기면
  // 아래로 마저 날리며 페이드아웃한 뒤 닫는다.
  const handleDrag = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) dragY.set(0);
  };
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // 가로 이동이 우세한 제스처(이전/다음 스와이프)가 대각선으로 흘러도 닫히지 않게 한다.
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) return;
    if (info.offset.y > 120 || info.velocity.y > 500) {
      animate(dragY, window.innerHeight, { duration: 0.3, ease: "easeIn", onComplete: onClose });
    }
  };

  const touchDist = (t: TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  // 두 손가락이면 핀치, 확대 상태의 한 손가락이면 팬, 아니면 좌우 스와이프로 분기한다.
  const handleTouchStart = (e: TouchEvent) => {
    const g = gesture.current;
    if (e.touches.length === 2) {
      g.mode = "pinch";
      g.startDist = touchDist(e.touches);
      g.startScale = scale.get();
    } else if (scale.get() > 1) {
      g.mode = "pan";
      g.startX = e.touches[0].clientX;
      g.startY = e.touches[0].clientY;
      g.startPanX = panX.get();
      g.startPanY = panY.get();
    } else {
      g.mode = "swipe";
      swipeStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    const g = gesture.current;
    if (g.mode === "pinch" && e.touches.length === 2) {
      const next = Math.min(
        Math.max(g.startScale * (touchDist(e.touches) / g.startDist), 1),
        MAX_SCALE,
      );
      scale.set(next);
      if (!zoomed && next > 1) setZoomed(true);
    } else if (g.mode === "pan" && e.touches.length === 1) {
      panX.set(g.startPanX + (e.touches[0].clientX - g.startX));
      panY.set(g.startPanY + (e.touches[0].clientY - g.startY));
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const g = gesture.current;
    if (g.mode === "swipe") {
      const diff = swipeStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && hasNext) go(1);
        else if (diff < 0 && hasPrev) go(-1);
      }
    }
    // 핀치를 풀어 원래 크기 근처로 오면 깔끔히 되돌린다.
    if (scale.get() <= 1.02) resetZoom();
    if (e.touches.length === 0) g.mode = "none";
  };

  // 데스크톱은 화면 폭만큼 밀면 이동이 과해 어지러우므로 360px로 제한하고, 화면 밖까지
  // 못 나가는 만큼 옅은 페이드로 마저 사라지게 한다. 모바일은 화면 폭만큼 밀어 완전히
  // 내보내므로(순수 슬라이드) 페이드가 없고, 이동이 짧아 조금 더 빠르게 튕긴다.
  const isDesktop = window.innerWidth >= 640;
  const slideDistance = isDesktop ? 360 : window.innerWidth;
  const slideVariants = {
    enter: (dir: -1 | 1) => ({ x: dir * slideDistance, opacity: isDesktop ? 0.4 : 1 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: -1 | 1) => ({ x: -dir * slideDistance, opacity: isDesktop ? 0 : 1 }),
  };
  const slideTransition = {
    x: { type: "spring" as const, stiffness: isDesktop ? 200 : 260, damping: 32 },
    opacity: { duration: 0.3 },
  };

  // 슬라이드 전환 + 위치(드래그 y) 공통 속성. 영상은 이 조합을 그대로 쓴다.
  // 모바일 영상은 폭을 항상 꽉 채우고(w-full), 높이는 상단 바(인덱스·닫기) 여유 포함 6rem
  // 아래부터 화면 바닥까지 허용한 뒤 그래도 넘치면 위아래를 잘라낸다(object-cover). mt-12
  // (바 예산의 절반)로 중앙 정렬을 아래로 밀면 최대 높이일 때 정확히 그 경계~바닥에 붙는다.
  const slideProps = {
    custom: direction,
    variants: slideVariants,
    initial: "enter" as const,
    animate: "center" as const,
    exit: "exit" as const,
    transition: slideTransition,
    style: { y: dragY },
    className:
      "pointer-events-auto absolute mt-12 w-full max-h-[calc(100dvh-6rem)] max-w-full cursor-default object-cover sm:mt-0 sm:w-auto sm:max-h-full sm:object-contain",
  };
  // 세로 드래그로 닫기 + 가로 스와이프로 이동. 확대 중이면 닫기 드래그를 꺼서 팬과 겹치지 않게 한다.
  const gestureProps = {
    drag: zoomed ? (false as const) : ("y" as const),
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.6 },
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
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
        <div className="pointer-events-auto mx-auto text-base text-black dark:text-white sm:text-xl">
          {current + 1} / {media.length}
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

      <div className="pointer-events-none relative flex h-[85vh] w-full items-center justify-center sm:w-[90vw]">
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

        <motion.div
          style={{ opacity: imageOpacity }}
          className="pointer-events-none absolute flex h-full w-full items-center justify-center"
        >
          <AnimatePresence initial={false} custom={direction}>
            {shown.type === "image" ? (
              <motion.div
                key={shown.src}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                {...gestureProps}
                onClick={(e) => e.stopPropagation()}
                style={{ y: dragY, touchAction: "none" }}
                className="pointer-events-auto absolute flex w-full max-h-full max-w-full items-center justify-center sm:w-auto"
              >
                {/* 모바일은 w-full로 화면 폭을 꽉 채운다. 원본이 작으면 srcset 밀도 계산 때문에
                    선언 폭보다 축소 렌더되어 화면을 못 채우던 것도 함께 해결된다. */}
                <motion.img
                  style={{ scale, x: panX, y: panY }}
                  onDoubleClick={toggleZoom}
                  src={shown.src}
                  srcSet={shown.srcSet}
                  sizes="100vw"
                  alt={shown.alt}
                  draggable={false}
                  className="w-full max-h-[85vh] max-w-full cursor-default object-contain sm:w-auto sm:max-w-[90vw]"
                />
              </motion.div>
            ) : (
              <motion.video
                key={shown.src}
                {...slideProps}
                {...gestureProps}
                ref={videoRef}
                onCanPlay={() => void videoRef.current?.play().catch(() => {})}
                src={shown.src}
                controls
                autoPlay
                playsInline
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
