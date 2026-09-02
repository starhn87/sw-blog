import handler from "../.open-next/worker.js";
import routes from "../.open-next/ssg-routes.js";

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

    let response: Response | undefined;
    const route = routes[url.pathname];
    const cookies = request.headers.get("cookie") ?? "";
    if (route && ["GET", "HEAD"].includes(request.method) &&
        !request.headers.has("next-action") && !request.headers.has("x-prerender-revalidate") &&
        !cookies.includes("__prerender_bypass") && !cookies.includes("__next_preview_data")) {
      const rsc = request.headers.get("rsc") === "1";
      const segment = request.headers.get("next-router-segment-prefetch");
      const assetPath = rsc
        ? (segment ? (Object.hasOwn(route.segments, segment) ? route.segments[segment] : undefined) : route.rsc)
        : route.html;
      if (assetPath) {
        const headers = new Headers(request.headers);
        headers.delete("range");
        const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), {
          method: request.method, headers,
        }));
        response = new Response(asset.body, asset);
        if (asset.status === 200 || asset.status === 304) {
          response = new Response(response.body, { status: asset.status === 304 ? 304 : route.status, headers: response.headers });
          for (const [name, value] of Object.entries(route.headers)) response.headers.set(name, value);
          response.headers.set("Content-Type", rsc ? "text/x-component" : "text/html; charset=utf-8");
          response.headers.set("Cache-Control", route.status >= 400
            ? "private, no-cache, no-store, max-age=0, must-revalidate"
            : "s-maxage=31536000, stale-while-revalidate=2592000");
          response.headers.set("Vary", "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url");
          response.headers.set("X-SSG-Cache", "HIT");
          if (rsc && segment) response.headers.set("x-nextjs-postponed", "2");
        }
      }
    }

    const result = response ?? await handler.fetch(request, env, ctx);
    if (!preview) return result;
    const noindexResponse = new Response(result.body, result);
    noindexResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return noindexResponse;
  },
} satisfies ExportedHandler<Cloudflare.Env>;
