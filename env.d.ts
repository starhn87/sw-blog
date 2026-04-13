declare module "*.css" {}

// Fix react-markdown JSX compatibility with React 19 types
declare module "react-markdown" {
  import type { ReactNode, ComponentType } from "react";
  import type { Components } from "react-markdown/lib";

  interface Options {
    children?: string;
    className?: string;
    components?: Partial<Components>;
    [key: string]: unknown;
  }

  export default function Markdown(props: Options): ReactNode;
  export type { Options, Components };
}

interface CloudflareEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  ANTHROPIC_API_KEY: string;
  ADMIN_PASSWORD: string;
  CF_AIG_TOKEN: string;
}

declare module "@cloudflare/next-on-pages" {
  export function getRequestContext(): {
    env: CloudflareEnv;
    ctx: ExecutionContext;
  };
}
