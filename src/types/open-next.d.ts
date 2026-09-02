// OpenNext's entry point is generated after Next.js type checking on clean builds.
declare module "*.open-next/worker.js" {
  const handler: { fetch: ExportedHandlerFetchHandler<CloudflareEnv> };
  export default handler;
}
