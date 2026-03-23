import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { ImageZoom } from "./ImageZoom";

export const mdxComponents = {
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  Callout,
  ImageZoom,
};
