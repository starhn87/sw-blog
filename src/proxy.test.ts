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
});
