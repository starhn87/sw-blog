"use client";

import { useEffect, useRef, useCallback } from "react";
import { useImageZoom } from "@/hooks/useImageZoom";
import { ImageZoomModal } from "./ImageZoomModal";

export function ProseZoom({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoomedSrc, zoomedAlt, open, close } = useImageZoom();

  const handleImgLoad = useCallback((e: Event) => {
    const img = e.target as HTMLImageElement;
    img.dataset.loaded = "true";
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const imgs = container.querySelectorAll("img");
    imgs.forEach((img) => {
      if (!img.hasAttribute("loading")) {
        img.loading = "lazy";
      }
      if (img.complete && img.naturalWidth > 0) {
        img.dataset.loaded = "true";
      } else {
        img.addEventListener("load", handleImgLoad, { once: true });
      }
    });

    return () => {
      imgs.forEach((img) => img.removeEventListener("load", handleImgLoad));
    };
  }, [handleImgLoad]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG" || target.closest("video, figure:has(video)")) return;
    const img = target as HTMLImageElement;
    open(img.src, img.alt || "");
  };

  return (
    <>
      <div ref={containerRef} onClick={handleClick} className="prose-img-skeleton [&_img]:cursor-zoom-in">
        {children}
      </div>

      {zoomedSrc && <ImageZoomModal src={zoomedSrc} alt={zoomedAlt} onClose={close} />}
    </>
  );
}
