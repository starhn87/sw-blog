import handler from "../.open-next/worker.js";
import routes from "../.open-next/ssg-routes.js";
import { logError } from "./lib/log";
import { handleApiRequest } from "./lib/workerApi";

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

    const publicStats = request.method === "GET" && (
      (url.pathname === "/api/views" && ["", "?days=7"].includes(url.search)) ||
      (["/api/likes", "/api/comments"].includes(url.pathname) && url.search === "")
    );
    const variantHeaders = ["rsc", "next-router-state-tree", "next-router-prefetch", "next-router-segment-prefetch", "next-url"];
    const bypassStatsCache = [...variantHeaders, "authorization", "x-admin-password", "range", "next-action", "x-prerender-revalidate"]
      .some((header) => request.headers.has(header)) ||
      /\b(?:no-cache|no-store|max-age\s*=\s*0)\b/i.test(
        `${request.headers.get("cache-control") ?? ""},${request.headers.get("pragma") ?? ""}`,
      ) || cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
    const statsKey = publicStats && !bypassStatsCache
      ? new Request(new URL(`/cdn-cgi/_stats/v1${url.pathname}${url.search}`, url))
      : undefined;
    let statsCache: Cache | undefined;
    if (statsKey) {
      try {
        statsCache = await caches.open("post-stats");
        const cached = await statsCache.match(statsKey);
        if (cached) {
          response = new Response(cached.body, cached);
          response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
          response.headers.set("X-Stats-Cache", "HIT");
        }
      } catch (error) {
        logError("stats-cache-read", error);
      }
    }

    let result: Response = response ?? await handleApiRequest(request, env, ctx) ?? await handler.fetch(request, env, ctx);
    if (publicStats && !response) {
      result = new Response(result.body, result);
      result.headers.set("X-Stats-Cache", "BYPASS");
      const vary = (result.headers.get("vary") ?? "").toLowerCase().split(",").map((header) => header.trim()).filter(Boolean);
      if (statsKey && statsCache && result.status === 200 && result.headers.get("content-type")?.startsWith("application/json") &&
          !result.headers.has("set-cookie") &&
          !/\b(?:private|no-store|no-cache)\b/i.test(result.headers.get("cache-control") ?? "") &&
          vary.every((header) => variantHeaders.includes(header))) {
        const cached = result.clone();
        cached.headers.set("Cache-Control", "public, max-age=30");
        ctx.waitUntil(statsCache.put(statsKey, cached).catch((error: unknown) => {
          logError("stats-cache-write", error);
        }));
        result.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
        result.headers.set("X-Stats-Cache", "MISS");
      } else if (bypassStatsCache) {
        result.headers.set("Cache-Control", "private, no-store");
      }
    }
    if (!preview) return result;
    const noindexResponse = new Response(result.body, result);
    noindexResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return noindexResponse;
  },
} satisfies ExportedHandler<Cloudflare.Env>;
