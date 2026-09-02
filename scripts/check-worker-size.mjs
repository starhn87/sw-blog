import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const bundle = await readFile(process.argv[2]);
const boundary = bundle.subarray(2, bundle.indexOf("\n")).toString().trim();
const parts = await new Response(bundle, {
  headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
}).formData();
const { main_module: mainModule } = JSON.parse(parts.get("metadata"));
const main = parts.get(mainModule);
assert.ok(main instanceof Blob, "Wrangler upload bundle contains no main module.");
const modules = [...parts.entries()]
  .filter(([name, part]) => name !== mainModule && part instanceof Blob && part.type !== "application/source-map")
  .map(([, part]) => part);
// Match Wrangler's gzip report: additional modules first, entry point last.
modules.push(main);
const bytes = gzipSync(await new Blob(modules).arrayBuffer()).byteLength;
const limit = 3 * 1024 * 1024;
console.log(`Worker gzip: ${(bytes / 1024).toFixed(2)} KiB / ${limit / 1024} KiB (Workers Free)`);
assert.ok(bytes <= limit, "Worker bundle exceeds the Workers Free gzip limit.");
