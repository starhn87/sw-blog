"use client";

import { useState, useEffect } from "react";

export function useImageZoom() {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const [zoomedAlt, setZoomedAlt] = useState("");

  useEffect(() => {
    if (!zoomedSrc) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedSrc(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomedSrc]);

  const open = (src: string, alt = "") => {
    setZoomedSrc(src);
    setZoomedAlt(alt);
  };

  const close = () => setZoomedSrc(null);

  return { zoomedSrc, zoomedAlt, open, close };
}
