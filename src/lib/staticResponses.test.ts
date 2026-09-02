import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("emits immutable pages and allowlisted metadata as exact, content-addressed assets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sw-blog-static-responses-"));
  try {
    await Promise.all([".next", ".open-next/assets", ".open-next/cache/test-build"].map((path) =>
      mkdir(join(directory, path), { recursive: true }),
    ));
    await writeFile(join(directory, ".open-next/assets/BUILD_ID"), "test-build\n");
    await writeFile(join(directory, ".next/prerender-manifest.json"), JSON.stringify({ routes: {
      "/": { initialRevalidateSeconds: false },
      "/한글": { initialRevalidateSeconds: false },
      "/feed.xml": { initialRevalidateSeconds: false },
      "/other.xml": { initialRevalidateSeconds: false },
      "/_not-found": { initialRevalidateSeconds: false },
      "/isr": { initialRevalidateSeconds: 60 },
    } }));
    const cached = {
      type: "app", html: "<html>한글</html>", rsc: "full-rsc",
      segmentData: { "/_tree": "tree-rsc", "/_index": "full-rsc" },
      meta: { headers: { "x-next-cache-tags": "internal", "x-nextjs-stale-time": "300" }, status: 200 },
    };
    for (const name of ["index", "한글"]) {
      await writeFile(join(directory, `.open-next/cache/test-build/${name}.cache`), JSON.stringify(cached));
    }
    const feed = {
      type: "route", body: "<rss>한글 &amp; metadata</rss>",
      meta: { status: 200, headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=3600",
        "x-next-cache-tags": "internal",
      } },
    };
    await writeFile(join(directory, ".open-next/cache/test-build/feed.xml.cache"), JSON.stringify(feed));
    await writeFile(join(directory, ".open-next/cache/test-build/other.xml.cache"), JSON.stringify({ type: "route" }));
    await writeFile(join(directory, ".open-next/cache/test-build/_not-found.cache"), JSON.stringify({ ...cached, meta: { status: 404 } }));
    const script = fileURLToPath(new URL("../../scripts/build-static-responses.mjs", import.meta.url));
    await promisify(execFile)(process.execPath, [script], { cwd: directory });
    const source = await readFile(join(directory, ".open-next/ssg-routes.js"), "utf8");
    const routes = JSON.parse(source.split("\n")[1].replace(/^const routes = /, "").replace(/;$/, ""));
    expect(Object.keys(routes)).toEqual(["/", encodeURI("/한글"), "/feed.xml", "/_not-found"]);
    expect(routes["/feed.xml"].headers).toEqual({
      "content-type": feed.meta.headers["content-type"],
      "cache-control": feed.meta.headers["cache-control"],
    });
    expect(routes["/feed.xml"].html).toBeUndefined();
    expect(routes["/feed.xml"].rsc).toBeUndefined();
    expect(routes["/feed.xml"].segments).toEqual({});
    expect(routes["/_not-found"].status).toBe(404);
    expect(await readFile(join(directory, ".open-next/assets", routes["/_not-found"].html), "utf8")).toBe(cached.html);
    expect(routes["/"].headers).toEqual({ "x-nextjs-stale-time": "300" });
    expect(routes["/"].status).toBe(200);
    expect(routes["/"].rsc).toBe(routes["/"].segments["/_index"]);
    for (const [asset, body] of [
      [routes["/"].html, cached.html], [routes["/"].rsc, cached.rsc],
      [routes["/"].segments["/_tree"], cached.segmentData["/_tree"]],
      [routes["/feed.xml"].body, feed.body],
    ]) {
      expect(asset).toBe(`/cdn-cgi/_ssg/test-build/${createHash("sha256").update(body).digest("hex")}.bin`);
      expect(await readFile(join(directory, ".open-next/assets", asset), "utf8")).toBe(body);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
