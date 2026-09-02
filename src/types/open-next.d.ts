// OpenNext's entry point is generated after Next.js type checking on clean builds.
declare module "*.open-next/worker.js" {
  const handler: { fetch: ExportedHandlerFetchHandler<CloudflareEnv> };
  export default handler;
}

declare module "*.open-next/ssg-routes.js" {
  const routes: Record<string, {
    html: string;
    rsc?: string;
    segments: Record<string, string>;
    headers: Record<string, string>;
    status: number;
  }>;
  export default routes;
}
