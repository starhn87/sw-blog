import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";

const buildId = (await readFile(".open-next/assets/BUILD_ID", "utf8")).trim();
const { routes, dynamicRoutes } = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
const routing = JSON.parse(await readFile(".next/routes-manifest.json", "utf8"));
const middleware = JSON.parse(await readFile(".next/server/middleware-manifest.json", "utf8"));
const functions = JSON.parse(await readFile(".next/server/functions-config-manifest.json", "utf8"));
const directory = `cdn-cgi/_ssg/${buildId}`;
await mkdir(`.open-next/assets/${directory}`, { recursive: true });
const responses = {};

async function emit(body) {
  assert.equal(typeof body, "string", "Expected a prerendered text response");
  const digest = createHash("sha256").update(body).digest("hex");
  const asset = `/${directory}/${digest}.bin`;
  await writeFile(`.open-next/assets${asset}`, body);
  return asset;
}

for (const [pathname, route] of Object.entries(routes)) {
  if (route.initialRevalidateSeconds !== false) continue;
  const key = pathname === "/" ? "/index" : pathname;
  const cached = JSON.parse(await readFile(`.open-next/cache/${buildId}${key}.cache`, "utf8"));
  const status = cached.meta?.status ?? 200;
  const headers = { ...cached.meta?.headers };
  delete headers["x-next-cache-tags"];
  if (cached.type === "route" && status === 200 && ["/feed.xml", "/sitemap.xml", "/robots.txt", "/icon.svg"].includes(pathname)) {
    responses[pathname] = { body: await emit(cached.body), segments: {}, headers, status };
    continue;
  }
  if (cached.type !== "app" || (status !== 200 && !(pathname === "/_not-found" && status === 404))) continue;
  const segments = {};
  for (const [segment, body] of Object.entries(cached.segmentData ?? {})) {
    segments[segment] = await emit(body);
  }
  responses[encodeURI(pathname)] = {
    html: await emit(cached.html),
    rsc: cached.rsc === undefined ? undefined : await emit(cached.rsc),
    segments,
    headers,
    status,
  };
}

// Keep live routes, routing rules and public assets out of the early 404 response.
const assetPaths = (await readdir(".open-next/assets", { recursive: true }))
  .filter((path) => !/^(?:_next|cdn-cgi)(?:\/|$)/.test(path) && !["_headers", "_redirects", "BUILD_ID"].includes(path))
  .flatMap((path) => path.endsWith(".html")
    ? [`/${path}`, `/${path.slice(0, -5)}`, ...(path === "index.html" || path.endsWith("/index.html") ? [`/${path.slice(0, -10)}`.replace(/\/$/, "") || "/"] : [])]
    : [`/${path}`]);
const nextRoutePatterns = [
  ...[...Object.keys(routes), ...assetPaths].map((path) => `^${encodeURI(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  ...routing.staticRoutes.map((route) => route.regex),
  ...routing.dynamicRoutes.filter((route) => dynamicRoutes[route.page]?.fallback !== false).map((route) => route.regex),
  ...[...routing.redirects, ...Object.values(routing.rewrites).flat(), ...routing.headers].map((route) => route.regex),
  ...[...Object.values(middleware.middleware), ...Object.values(functions.functions)]
    .flatMap((entry) => entry.matchers?.map((matcher) => matcher.regexp) ?? ["^/"]),
];

await writeFile(".open-next/ssg-routes.js", [
  "/** @type {Record<string, {html?: string, body?: string, rsc?: string, segments: Record<string, string>, headers: Record<string, string>, status: number}>} */",
  `const routes = ${JSON.stringify(responses)};`,
  `export const nextRoutePatterns = ${JSON.stringify([...new Set(nextRoutePatterns)])};`,
  "export default routes;\n",
].join("\n"));
console.log(`Static response assets built: ${Object.keys(responses).length} routes`);
