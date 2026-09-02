import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function verifyWorkerRelease(origin, release, fetcher = fetch) {
  const url = new URL(origin);
  assert.ok(url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname), "HTTPS required");
  const preview = url.hostname.endsWith(".workers.dev");
  const request = async (path) => {
    const target = new URL(path, url);
    target.searchParams.set("release", release.buildId);
    const response = await fetcher(target, { redirect: "manual", headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(30_000) });
    assert.equal(response.status, 200, `Release check failed: ${path}`);
    assert.equal(/noindex/i.test(response.headers.get("x-robots-tag") ?? ""), preview, `Indexing policy: ${path}`);
    return response;
  };
  assert.equal((await (await request("/BUILD_ID")).text()).trim(), release.buildId, "Deployed build does not match this release");
  for (const name of ["search-index.json", "rag-chunks.json", "codebase-summary.txt"]) {
    const body = await (await request(`/${name}`)).arrayBuffer();
    assert.equal(createHash("sha256").update(Buffer.from(body)).digest("hex"), release.assets[name].sha256, `Stale deployed asset: ${name}`);
  }
  const home = await request("/");
  assert.equal(home.headers.get("x-ssg-cache"), "HIT", "Home must use the Workers SSG path");
  const html = await home.text();
  assert.match(html, /<html[^>]*lang="ko"/);
  assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html), "Public home must not contain noindex metadata");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const release = JSON.parse(await readFile(".open-next/release.json", "utf8"));
  await verifyWorkerRelease(process.argv[2] ?? "https://www.seung-woo.me", release);
  console.log("Deployed build, index assets, SSG and indexing policy verified.");
}
