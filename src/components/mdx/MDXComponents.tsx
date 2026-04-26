import type { HTMLAttributes, AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { Video } from "./Video";
import { PostLink } from "./PostLink";
import Source from "./Source";
import { canOptimize, getImageSrcSet, getOptimizedImageUrl, getZoomImageUrl } from "@/lib/image";

type SizeValue = string | number;
type MdxImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "sizes"> & {
  sizes?: string | [SizeValue, SizeValue];
  priority?: boolean;
};

function toCssSize(value: SizeValue): string {
  return typeof value === "number" ? `${value}px` : value;
}

function pickDefaultWidth(value: SizeValue, fallback: number): number {
  if (typeof value === "number") return value;
  const match = value.match(/^(\d+)px$/);
  return match ? Number(match[1]) : fallback;
}

function MdxImage({ className, src, sizes: sizesProp, priority, ...props }: MdxImageProps) {
  const cls = typeof className === "string" ? className : "";
  const isGridItem = cls.includes("aspect-square");
  const srcStr = typeof src === "string" ? src : undefined;
  const optimizable = srcStr ? canOptimize(srcStr) : false;

  const fallbackWidth = isGridItem ? 400 : 800;
  let resolvedSizes: string | undefined;
  let defaultWidth = fallbackWidth;

  if (Array.isArray(sizesProp)) {
    const [mobile, desktop] = sizesProp;
    resolvedSizes = `(min-width: 1024px) ${toCssSize(desktop)}, ${toCssSize(mobile)}`;
    defaultWidth = pickDefaultWidth(desktop, fallbackWidth);
  } else if (typeof sizesProp === "string") {
    resolvedSizes = sizesProp;
  } else if (optimizable) {
    resolvedSizes = isGridItem
      ? "(min-width: 1024px) 400px, 50vw"
      : "(min-width: 1024px) 800px, 100vw";
  }

  const optimizedSrc = optimizable && srcStr ? getOptimizedImageUrl(srcStr, defaultWidth) : srcStr;
  const zoomSrc = optimizable && srcStr ? getZoomImageUrl(srcStr) : undefined;
  const srcSet = optimizable && srcStr ? getImageSrcSet(srcStr) : undefined;

  return (
    <img
      {...props}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={resolvedSizes}
      data-zoom-src={zoomSrc}
      className={cls ? `${cls} border border-border` : "border border-border"}
      {...(priority
        ? { fetchPriority: "high", loading: "eager", decoding: "async" }
        : {})}
    />
  );
}

export const mdxComponents = {
  pre: (props: HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: MdxImage,
  Img: MdxImage,
  Callout,
  Video,
  PostLink,
  Source,
};
