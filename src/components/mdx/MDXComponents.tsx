import type { HTMLAttributes, AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { Video } from "./Video";
import { canOptimize, getImageSrcSet, getOptimizedImageUrl } from "@/lib/image";

function MdxImage({ className, src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const isHero = typeof className === "string" && className.includes("aspect-[21/9]");
  const srcStr = typeof src === "string" ? src : undefined;
  const optimizable = srcStr ? canOptimize(srcStr) : false;
  const optimizedSrc = optimizable && srcStr ? getOptimizedImageUrl(srcStr, 1200) : srcStr;
  const srcSet = optimizable && srcStr ? getImageSrcSet(srcStr) : undefined;
  const sizes = optimizable ? "(min-width: 1024px) 768px, 100vw" : undefined;
  return (
    <img
      {...props}
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes}
      className={className}
      {...(isHero
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
};
