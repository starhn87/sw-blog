import handler from "../.open-next/worker.js";

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const skipPolicy = /^\/(?:_next\/static|_next\/image|favicon\.ico)/.test(url.pathname);
    const preview = !skipPolicy && (host.endsWith(".pages.dev") || host.endsWith(".workers.dev"));

    if (!skipPolicy && host === "sw-blog.pages.dev") {
      return Response.redirect(new URL(url.pathname + url.search, "https://www.seung-woo.me"), 301);
    }

    if (preview && url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return Response.json({ error: "Preview is read-only" }, {
        status: 403,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }

    const response = await handler.fetch(request, env, ctx);
    if (!preview) return response;
    const noindexResponse = new Response(response.body, response);
    noindexResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return noindexResponse;
  },
} satisfies ExportedHandler<CloudflareEnv>;
