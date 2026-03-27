declare module "*.css" {}

interface CloudflareEnv {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  CF_AIG_TOKEN: string;
}

declare module "@cloudflare/next-on-pages" {
  export function getRequestContext(): {
    env: CloudflareEnv;
    ctx: ExecutionContext;
  };
}
