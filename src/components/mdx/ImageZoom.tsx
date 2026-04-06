"use client";

import Image from "next/image";
import { useImageZoom } from "@/hooks/useImageZoom";
import { ImageZoomModal } from "./ImageZoomModal";

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
  const { zoomedSrc, zoomedAlt, open, close } = useImageZoom();

  return (
    <>
      <figure className="my-6">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="cursor-zoom-in rounded-lg"
          onClick={() => open(src, alt)}
        />
        {alt && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {alt}
          </figcaption>
        )}
      </figure>

      {zoomedSrc && <ImageZoomModal src={zoomedSrc} alt={zoomedAlt} onClose={close} />}
    </>
  );
}
