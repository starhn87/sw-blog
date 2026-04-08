import type { HTMLAttributes, AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { Video } from "./Video";

export const mdxComponents = {
  pre: (props: HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  img: ({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
    const isHero = typeof className === "string" && className.includes("aspect-[21/9]");
    return (
      <img
        {...props}
        className={className}
        {...(isHero
          ? { fetchPriority: "high", loading: "eager", decoding: "async" }
          : {})}
      />
    );
  },
  Callout,
  Video,
};
