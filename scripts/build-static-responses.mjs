import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const buildId = (await readFile(".open-next/assets/BUILD_ID", "utf8")).trim();
const { routes } = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
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
  if (cached.type !== "app" || (status !== 200 && !(pathname === "/_not-found" && status === 404))) continue;
  const segments = {};
  for (const [segment, body] of Object.entries(cached.segmentData ?? {})) {
    segments[segment] = await emit(body);
  }
  const headers = { ...cached.meta?.headers };
  delete headers["x-next-cache-tags"];
  responses[encodeURI(pathname)] = {
    html: await emit(cached.html),
    rsc: cached.rsc === undefined ? undefined : await emit(cached.rsc),
    segments,
    headers,
    status,
  };
}

await writeFile(".open-next/ssg-routes.js", [
  "/** @type {Record<string, {html: string, rsc?: string, segments: Record<string, string>, headers: Record<string, string>, status: number}>} */",
  `const routes = ${JSON.stringify(responses)};`,
  "export default routes;\n",
].join("\n"));
console.log(`Static response assets built: ${Object.keys(responses).length} routes`);
