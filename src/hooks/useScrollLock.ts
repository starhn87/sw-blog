import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useScrollLock(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const startY = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop === 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
      if (atTop || atBottom) e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = startY.current - e.touches[0].clientY;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop === 0 && deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight && deltaY > 0;
      if (atTop || atBottom) e.preventDefault();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [ref, enabled]);
}
