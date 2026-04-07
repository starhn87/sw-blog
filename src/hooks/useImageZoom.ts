"use client";

import { useState, useEffect, useCallback } from "react";

export type ZoomMedia =
  | { type: "image"; src: string; alt: string }
  | { type: "video"; src: string };

export function useImageZoom() {
  const [media, setMedia] = useState<ZoomMedia[]>([]);
  const [index, setIndex] = useState<number>(-1);

  const close = useCallback(() => setIndex(-1), []);

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setIndex((prev) => {
        if (prev === -1) return prev;
        const next = prev + dir;
        if (next < 0 || next >= media.length) return prev;
        return next;
      });
    },
    [media.length],
  );

  useEffect(() => {
    if (index === -1) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, close, navigate]);

  const open = (list: ZoomMedia[], startIndex: number) => {
    setMedia(list);
    setIndex(startIndex);
  };

  return { media, index, open, close, navigate };
}
