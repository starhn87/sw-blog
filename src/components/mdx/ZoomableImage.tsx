"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function ProseZoom({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const [zoomedAlt, setZoomedAlt] = useState("");

  useEffect(() => {
    if (!zoomedSrc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedSrc(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomedSrc]);

  const handleImgLoad = useCallback((e: Event) => {
    const img = e.target as HTMLImageElement;
    img.dataset.loaded = "true";
  }, []);

  // 모든 img에 load 리스너 부착
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
    if (target.tagName !== "IMG") return;
    const img = target as HTMLImageElement;
    setZoomedSrc(img.src);
    setZoomedAlt(img.alt || "");
  };

  return (
    <>
      <div ref={containerRef} onClick={handleClick} className="prose-img-skeleton [&_img]:cursor-zoom-in">
        {children}
      </div>

      {zoomedSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomedAlt || "이미지 확대"}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-8"
          onClick={() => setZoomedSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedSrc}
            alt={zoomedAlt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
