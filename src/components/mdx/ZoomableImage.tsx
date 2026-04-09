"use client";

import { useEffect, useRef, useCallback, type ReactNode, type MouseEvent } from "react";
import { useImageZoom, type ZoomMedia } from "@/hooks/useImageZoom";
import { ImageZoomModal } from "./ImageZoomModal";

export function ProseZoom({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { media, index, open, close, navigate } = useImageZoom();

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

  const collectMedia = (): { list: ZoomMedia[]; nodes: HTMLElement[] } => {
    const container = containerRef.current;
    if (!container) return { list: [], nodes: [] };

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>("img, video"),
    );
    const nodes: HTMLElement[] = [];
    const list: ZoomMedia[] = [];
    for (const el of elements) {
      if (el.tagName === "IMG") {
        const img = el as HTMLImageElement;
        nodes.push(img);
        list.push({
          type: "image",
          src: img.dataset.zoomSrc || img.src,
          alt: img.alt || "",
        });
      } else if (el.tagName === "VIDEO") {
        const video = el as HTMLVideoElement;
        nodes.push(video);
        list.push({ type: "video", src: video.currentSrc || video.src });
      }
    }
    return { list, nodes };
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const { list, nodes } = collectMedia();
    const startIndex = nodes.indexOf(target);
    if (startIndex === -1) return;
    open(list, startIndex);
  };

  // pointerdown fires ~50-150ms before click — give the zoom variant a head start
  const handlePointerDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const zoomSrc = (target as HTMLImageElement).dataset.zoomSrc;
    if (!zoomSrc) return;
    const img = new Image();
    img.src = zoomSrc;
  };

  return (
    <>
      <div ref={containerRef} onClick={handleClick} onPointerDown={handlePointerDown} className="prose-img-skeleton [&_img]:cursor-zoom-in">
        {children}
      </div>

      {index !== -1 && (
        <ImageZoomModal media={media} index={index} onClose={close} onNavigate={navigate} />
      )}
    </>
  );
}
