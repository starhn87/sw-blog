import { canOptimize, getImageSrcSet, getOptimizedImageUrl } from "@/lib/image";

export default function PostThumbnail({
  src,
  alt,
  width,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={canOptimize(src) ? getOptimizedImageUrl(src, width) : src}
      srcSet={getImageSrcSet(src)}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
