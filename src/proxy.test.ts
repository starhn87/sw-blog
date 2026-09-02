import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects the Pages production hostname without losing the path or query", () => {
    const request = new NextRequest("https://sw-blog.pages.dev/blog/motomap?q=map", {
      headers: { host: "sw-blog.pages.dev" },
    });
    const response = proxy(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://www.seung-woo.me/blog/motomap?q=map",
    );
  });

  it("prevents indexing of Pages previews", () => {
    const request = new NextRequest("https://preview.sw-blog.pages.dev/blog", {
      headers: { host: "preview.sw-blog.pages.dev" },
    });

    expect(proxy(request).headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("keeps the canonical hostname indexable", () => {
    const request = new NextRequest("https://www.seung-woo.me/blog", {
      headers: { host: "www.seung-woo.me" },
    });

    expect(proxy(request).headers.has("X-Robots-Tag")).toBe(false);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks %s on Worker previews", (method) => {
    const request = new NextRequest("https://sw-blog-preview.example.workers.dev/api/comments", {
      method,
      headers: { host: "sw-blog-preview.example.workers.dev" },
    });
    const response = proxy(request);
    expect(response.status).toBe(403);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("allows preview reads and prevents indexing version URLs", () => {
    const request = new NextRequest("https://version-sw-blog-preview.example.workers.dev/api/views", {
      headers: { host: "version-sw-blog-preview.example.workers.dev" },
    });
    const response = proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("does not block local or production mutations", () => {
    for (const host of ["localhost:3000", "www.seung-woo.me"]) {
      const request = new NextRequest(`https://${host}/api/comments`, {
        method: "POST",
        headers: { host },
      });
      expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
    }
  });

  it.each([
    "sw-blog-preview.example.workers.dev:443",
    "SW-BLOG-PREVIEW.EXAMPLE.WORKERS.DEV",
    "sw-blog-preview.example.workers.dev.",
  ])("normalizes the preview host %s before blocking writes", (host) => {
    const request = new NextRequest("https://sw-blog-preview.example.workers.dev/api/media", {
      method: "DELETE",
      headers: { host },
    });
    expect(proxy(request).status).toBe(403);
  });
});
