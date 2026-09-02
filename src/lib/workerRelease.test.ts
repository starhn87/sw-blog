import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyWorkerRelease, waitForWorkerRelease } from "../../scripts/verify-worker-release.mjs";
import { reindexWorker } from "../../scripts/reindex-worker.mjs";
import { checkWorkersCutover } from "../../scripts/check-workers-cutover.mjs";

const bodies: Record<string, string> = {
  "search-index.json": '[{"slug":"post"}]',
  "rag-chunks.json": '[{"slug":"post","chunkIndex":0}]',
  "codebase-summary.txt": "codebase snapshot",
};
const release = {
  buildId: "release-build",
  assets: Object.fromEntries(Object.entries(bodies).map(([name, body]) => [name, {
    sha256: createHash("sha256").update(body).digest("hex"), count: name.endsWith(".json") ? 1 : undefined,
  }])),
};

function deployedResponse(input: URL | RequestInfo) {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const headers: Record<string, string> = url.hostname.endsWith(".workers.dev") ? { "x-robots-tag": "noindex, nofollow" } : {};
  if (url.pathname === "/BUILD_ID") return new Response(release.buildId, { headers });
  if (url.pathname === "/") return new Response('<html lang="ko"><body>blog</body></html>', { headers: { ...headers, "x-ssg-cache": "HIT" } });
  if (url.pathname.endsWith("/index")) return Response.json({ indexed: 1, deleted: 0 });
  return new Response(bodies[url.pathname.slice(1)], { headers });
}

describe("release verification", () => {
  it("checks the build ID, exact index inputs, SSG and production noindex policy", async () => {
    const fetcher = vi.fn<typeof fetch>(async url => deployedResponse(url));
    await verifyWorkerRelease("https://www.seung-woo.me", release, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(5);
    for (const [, options] of fetcher.mock.calls) {
      expect(options?.redirect).toBe("manual");
      expect(options?.headers).toEqual({ "Cache-Control": "no-cache" });
    }
  });

  it("requires noindex on a workers.dev preview", async () => {
    await verifyWorkerRelease("https://sw-blog-preview.example.workers.dev", release, async input => deployedResponse(input));
    await expect(verifyWorkerRelease("https://sw-blog-preview.example.workers.dev", release,
      async () => new Response(release.buildId))).rejects.toThrow("Indexing policy");
  });

  it.each(["build", "asset", "noindex", "redirect", "ssg"])("rejects %s mismatches", async (failure) => {
    const fetcher = async (input: URL | RequestInfo) => {
      const path = new URL(input.toString()).pathname;
      if (failure === "build" && path === "/BUILD_ID") return new Response("old-build");
      if (failure === "asset" && path === "/rag-chunks.json") return new Response("[]");
      if (failure === "noindex") return new Response(release.buildId, { headers: { "x-robots-tag": "noindex" } });
      if (failure === "redirect") return new Response(null, { status: 301, headers: { Location: "https://another.example" } });
      if (failure === "ssg" && path === "/") return new Response('<html lang="ko"/>');
      return deployedResponse(input);
    };
    await expect(verifyWorkerRelease("https://www.seung-woo.me", release, fetcher)).rejects.toThrow();
  });
});

describe("deployment propagation", () => {
  afterEach(() => vi.useRealTimers());

  it("waits for an old build and then verifies every release asset without writing", async () => {
    vi.useFakeTimers();
    let stale = true;
    const fetcher = vi.fn<typeof fetch>(async input => {
      if (stale) { stale = false; return new Response("old-build"); }
      return deployedResponse(input);
    });
    const check = waitForWorkerRelease("https://www.seung-woo.me", release, fetcher);
    await vi.advanceTimersByTimeAsync(5000);
    await check;
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === undefined)).toBe(true);
  });

  it("stops after twelve stale-build checks", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(async () => new Response("old-build"));
    const check = expect(waitForWorkerRelease("https://www.seung-woo.me", release, fetcher)).rejects.toThrow("Deployed build");
    await vi.advanceTimersByTimeAsync(55_000);
    await check;
    expect(fetcher).toHaveBeenCalledTimes(12);
  });

  it.each(["asset", "noindex", "redirect"])("does not retry a %s failure", async failure => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      if (failure === "redirect") return new Response(null, { status: 301 });
      if (failure === "noindex") return new Response(release.buildId, { headers: { "x-robots-tag": "noindex" } });
      if (new URL(input.toString()).pathname === "/rag-chunks.json") return new Response("[]");
      return deployedResponse(input);
    });
    await expect(waitForWorkerRelease("https://www.seung-woo.me", release, fetcher)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(failure === "asset" ? 3 : 1);
  });
});

describe("release-bound reindexing", () => {
  it("verifies the release before each POST and sends the password only to the production index APIs", async () => {
    const fetcher = vi.fn<typeof fetch>(async input => deployedResponse(input));
    await reindexWorker(release, "test-password", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(12);
    const writes = fetcher.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(writes.map(([url]) => url.toString())).toEqual([
      "https://www.seung-woo.me/api/search/index", "https://www.seung-woo.me/api/chat/index",
    ]);
    expect(writes.every(([, options]) => options?.redirect === "manual")).toBe(true);
  });

  it("does not write when the deployed build is stale", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("old-build"));
    await expect(reindexWorker(release, "test-password", fetcher)).rejects.toThrow("Deployed build");
    expect(fetcher.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("stops without retrying mutations when an indexed count is wrong", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo, options?: RequestInit) =>
      options?.method === "POST" ? Response.json({ indexed: 0, deleted: 0 }) : deployedResponse(input));
    await expect(reindexWorker(release, "test-password", fetcher)).rejects.toThrow("Unexpected indexed count");
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  });

  it("stops before the second write if the deployment changes during indexing", async () => {
    let indexed = false;
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      if (options?.method === "POST") indexed = true;
      else if (indexed) return new Response("newer-build");
      return deployedResponse(input);
    });
    await expect(reindexWorker(release, "test-password", fetcher)).rejects.toThrow("Deployed build");
    expect(fetcher.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  });
});

describe("cutover preflight", () => {
  const hosts = ["www.seung-woo.me", "seung-woo.me"];
  const secrets = ["ANTHROPIC_API_KEY", "ADMIN_PASSWORD", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  it.each(["ready", "pages-build", "preview-build", "pages-domain", "worker-domain", "secret", "api-error"])("checks %s state without changing it", async (state) => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      if (state === "api-error") return new Response(null, { status: 403 });
      const path = new URL(input.toString()).pathname;
      const result = path.includes("/pages/")
        ? { source: { config: { production_deployments_enabled: state === "pages-build", preview_deployment_setting: state === "preview-build" ? "all" : "none" } }, domains: state === "pages-domain" ? hosts : ["sw-blog.pages.dev"] }
        : path.endsWith("/domains")
          ? hosts.map(hostname => ({ hostname, service: state === "worker-domain" ? "other-worker" : "sw-blog" }))
          : { bindings: secrets.slice(state === "secret" ? 1 : 0).map(name => ({ name, type: "secret_text" })) };
      return Response.json({ success: true, result });
    });
    const check = checkWorkersCutover("account", "token", fetcher);
    if (state === "ready") await expect(check).resolves.toBeUndefined();
    else await expect(check).rejects.toThrow();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === undefined)).toBe(true);
  });
});
