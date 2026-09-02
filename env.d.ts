declare module "*.css" {}

// Fix react-markdown JSX compatibility with React 19 types
declare module "react-markdown" {
  import type { ReactNode } from "react";
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
