"use client";

import { useState, useEffect, useRef } from "react";

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

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const img = target as HTMLImageElement;
    setZoomedSrc(img.src);
    setZoomedAlt(img.alt || "");
  };

  return (
    <>
      <div ref={containerRef} onClick={handleClick} className="[&_img]:cursor-zoom-in">
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
