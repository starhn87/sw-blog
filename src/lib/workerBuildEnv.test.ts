import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it.each(["clean", "leak", "missing-public", "invalid-format"])("prepares a release with %s input", async (scenario) => {
  const directory = await mkdtemp(join(tmpdir(), "sw-blog-release-env-"));
  try {
    await Promise.all(["cloudflare", "assets", "server-functions"].map(path => mkdir(join(directory, ".open-next", path), { recursive: true })));
    const values = {
      ANTHROPIC_API_KEY: "private-test-key-12345", ADMIN_PASSWORD: "private-test-password-67890",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "public-map-key", NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: "public-map-client",
    };
    const source = ["production", "development", "test"].map(mode =>
      `export const ${mode} = ${JSON.stringify(scenario === "missing-public" ? { ADMIN_PASSWORD: values.ADMIN_PASSWORD } : values)};\n`).join("");
    await writeFile(join(directory, ".open-next/cloudflare/next-env.mjs"), scenario === "invalid-format" ? "export default {};\n" : source);
    await writeFile(join(directory, ".open-next/server-functions/handler.mjs"), scenario === "leak" ? values.ADMIN_PASSWORD : "export default {};");
    await writeFile(join(directory, ".open-next/assets/BUILD_ID"), "test-build\n");
    await writeFile(join(directory, ".open-next/assets/search-index.json"), '[{"slug":"post"}]');
    await writeFile(join(directory, ".open-next/assets/rag-chunks.json"), '[{"slug":"post","chunkIndex":0}]');
    await writeFile(join(directory, ".open-next/assets/codebase-summary.txt"), "test codebase");
    const script = fileURLToPath(new URL("../../scripts/prepare-worker-release.mjs", import.meta.url));
    const run = promisify(execFile)(process.execPath, [script, "--production"], {
      cwd: directory, env: { ...process.env, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "", NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: "" },
    });
    if (scenario !== "clean") {
      await expect(run).rejects.toThrow();
      await expect(readFile(join(directory, ".open-next/release.json"))).rejects.toThrow();
      return;
    }
    const output = await run;
    expect(output.stdout + output.stderr).not.toContain(values.ADMIN_PASSWORD);
    const sanitized = await readFile(join(directory, ".open-next/cloudflare/next-env.mjs"), "utf8");
    expect(sanitized).not.toContain("ADMIN_PASSWORD");
    expect(sanitized).not.toContain("ANTHROPIC_API_KEY");
    expect(sanitized).toContain("public-map-key");
    const release = JSON.parse(await readFile(join(directory, ".open-next/release.json"), "utf8"));
    expect(release.buildId).toBe("test-build");
    expect(release.assets["search-index.json"].count).toBe(1);
    expect(release.assets["rag-chunks.json"].sha256).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
