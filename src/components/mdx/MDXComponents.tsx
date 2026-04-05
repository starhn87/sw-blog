import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { ImageZoom } from "./ImageZoom";
import { Video } from "./Video";

export const mdxComponents = {
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
  Callout,
  ImageZoom,
  Video,
};
