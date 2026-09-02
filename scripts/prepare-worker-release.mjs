import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";

const envPath = ".open-next/cloudflare/next-env.mjs";
const source = await readFile(envPath, "utf8");
const lines = source.trim().split("\n");
assert.equal(lines.length, 3, "Unexpected OpenNext environment format");
const privateValues = new Map();
const publicEnvs = {};
for (const [index, mode] of ["production", "development", "test"].entries()) {
  const match = lines[index].match(new RegExp(`^export const ${mode} = (.+);$`));
  assert.ok(match, "Unexpected OpenNext environment export");
  let values;
  try { values = JSON.parse(match[1]); } catch { throw new Error("Invalid OpenNext environment JSON"); }
  assert.ok(values && typeof values === "object" && !Array.isArray(values), "Invalid environment object");
  publicEnvs[mode] = {};
  for (const [name, value] of Object.entries(values)) {
    assert.equal(typeof value, "string", "Environment values must be strings");
    if (name.startsWith("NEXT_PUBLIC_")) publicEnvs[mode][name] = value;
    else if (value && /(?:PASSWORD|SECRET|TOKEN|PRIVATE_KEY|API_KEY)$/.test(name)) privateValues.set(value, name);
  }
}

for (const directory of [".open-next/assets", ".open-next/server-functions"]) {
  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = `${entry.parentPath}/${entry.name}`;
    const contents = await readFile(path);
    for (const [value, name] of privateValues) {
      assert.ok(!contents.includes(value) && !contents.includes(JSON.stringify(value).slice(1, -1)),
        `Private build value remains in deployable output: ${name}`);
    }
  }
}

if (process.argv.includes("--production")) {
  for (const name of ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_NAVER_MAP_CLIENT_ID"]) {
    assert.ok((process.env[name] || publicEnvs.production[name])?.trim(), `Missing public build variable: ${name}`);
  }
}

const assets = {};
for (const name of ["search-index.json", "rag-chunks.json", "codebase-summary.txt"]) {
  const body = await readFile(`.open-next/assets/${name}`);
  assets[name] = { sha256: createHash("sha256").update(body).digest("hex") };
  if (name.endsWith(".json")) {
    const items = JSON.parse(body);
    assert.ok(Array.isArray(items) && items.length > 0, `Empty or invalid index: ${name}`);
    assets[name].count = items.length;
  }
}
const buildId = (await readFile(".open-next/assets/BUILD_ID", "utf8")).trim();
assert.ok(buildId, "Missing build ID");
// OpenNext copies every .env mode; runtime secrets belong in bindings, not the upload bundle.
await writeFile(envPath, Object.entries(publicEnvs).map(([mode, values]) =>
  `export const ${mode} = ${JSON.stringify(values)};\n`,
).join(""));
await writeFile(".open-next/release.json", JSON.stringify({ buildId, assets }, null, 2));
console.log("Worker environment sanitized; release asset fingerprints recorded.");
