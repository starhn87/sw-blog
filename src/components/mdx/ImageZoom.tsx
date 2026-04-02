"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export function ImageZoom({
  src,
  alt,
  width = 800,
  height = 450,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  return (
    <>
      <figure className="my-6">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="cursor-zoom-in rounded-lg"
          onClick={() => setZoomed(true)}
        />
        {alt && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {alt}
          </figcaption>
        )}
      </figure>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "이미지 확대"}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-8"
          onClick={() => setZoomed(false)}
        >
          <Image
            src={src}
            alt={alt}
            width={width * 2}
            height={height * 2}
            className="max-h-[90vh] w-auto rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
