import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const bootstrap = readFileSync("public/cloudflare-analytics.js", "utf8");

describe("canonical Web Analytics bootstrap", () => {
  it.each(["www.seung-woo.me", "seung-woo.me"])("keeps the existing RUM token on %s", hostname => {
    const beacon = { setAttribute: vi.fn(), id: "", defer: false, src: "" };
    const document = { createElement: vi.fn(() => beacon), body: { appendChild: vi.fn() } };
    runInNewContext(bootstrap, { window: { location: { hostname } }, document });
    expect(document.createElement).toHaveBeenCalledWith("script");
    expect(beacon.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
    expect(beacon.defer).toBe(true);
    expect(beacon.setAttribute).toHaveBeenCalledWith("data-cf-beacon", JSON.stringify({ token: "7638c47570614969b00e3429d1419f48" }));
    expect(document.body.appendChild).toHaveBeenCalledExactlyOnceWith(beacon);
  });

  it.each(["localhost", "127.0.0.1", "sw-blog-preview.starhn87.workers.dev", "preview.sw-blog.pages.dev"])("does not track %s", hostname => {
    const document = { createElement: vi.fn() };
    runInNewContext(bootstrap, { window: { location: { hostname } }, document });
    expect(document.createElement).not.toHaveBeenCalled();
  });
});
