"use client";

import { useState } from "react";

export function Video({
  src,
  poster,
  caption,
  autoPlay = false,
  loop = false,
  muted = true,
}: {
  src: string;
  poster?: string;
  caption?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className="my-4">
      <div className="relative overflow-hidden rounded-lg">
        {!loaded && (
          <div className="absolute inset-0 animate-pulse rounded-lg bg-muted" />
        )}
        <video
          src={src}
          poster={poster}
          controls
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setLoaded(true)}
          className={`w-full rounded-lg transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
