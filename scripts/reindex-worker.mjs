import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { verifyWorkerRelease } from "./verify-worker-release.mjs";

export async function reindexWorker(release, password, fetcher = fetch) {
  assert.ok(password, "ADMIN_PASSWORD is required");
  const origin = "https://www.seung-woo.me";
  for (const [path, asset] of [["/api/search/index", "search-index.json"], ["/api/chat/index", "rag-chunks.json"]]) {
    // Recheck between writes so a changed deployment cannot silently index another release.
    await verifyWorkerRelease(origin, release, fetcher);
    const response = await fetcher(new URL(path, origin), {
      method: "POST", redirect: "manual", headers: { "x-admin-password": password }, signal: AbortSignal.timeout(180_000),
    });
    assert.equal(response.status, 200, `Reindex failed: ${path}`);
    const result = await response.json();
    assert.equal(result.indexed, release.assets[asset].count, `Unexpected indexed count: ${path}`);
    assert.ok(Number.isInteger(result.deleted) && result.deleted >= 0, `Invalid reindex result: ${path}`);
    console.log(`${path}: indexed=${result.indexed}, deleted=${result.deleted}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const release = JSON.parse(await readFile(".open-next/release.json", "utf8"));
  await reindexWorker(release, process.env.ADMIN_PASSWORD);
}
