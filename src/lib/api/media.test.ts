import { afterEach, describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "../workerApi";

afterEach(() => vi.unstubAllEnvs());

describe("native media API", () => {
  it.each(["GET", "HEAD", "POST", "PUT", "DELETE"])("checks auth before accessing R2 or reading a %s body", async (method) => {
    vi.stubEnv("ADMIN_PASSWORD", "test-password");
    const bucket = { get: vi.fn(), head: vi.fn(), list: vi.fn(), put: vi.fn(), delete: vi.fn() };
    const env = { MEDIA: bucket, ADMIN_PASSWORD: "test-password" } as unknown as CloudflareEnv;
    const request = new Request("https://example.test/api/media?list=1", {
      method, headers: { "x-admin-password": "wrong" },
      ...(["GET", "HEAD"].includes(method) ? {} : { body: "invalid body" }),
    });
    const response = await handleApiRequest(request, env, { waitUntil: vi.fn() });
    expect(response?.status).toBe(401);
    expect(response?.headers.get("X-API-Runtime")).toBe("worker");
    expect(await response?.text()).toBe(method === "HEAD" ? "" : '{"error":"unauthorized"}');
    for (const operation of Object.values(bucket)) expect(operation).not.toHaveBeenCalled();
    expect(request.bodyUsed).toBe(false);
  });

  it("streams public R2 ranges with the original metadata", async () => {
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode("2345"));
      controller.close();
    } });
    const bucket = {
      head: vi.fn().mockResolvedValue({ size: 10 }),
      get: vi.fn().mockResolvedValue({ body, httpMetadata: { contentType: "video/mp4" } }),
    };
    const env = { MEDIA: bucket } as unknown as CloudflareEnv;
    const response = await handleApiRequest(new Request("https://example.test/api/media?key=video.mp4", {
      headers: { Range: "bytes=2-5" },
    }), env, { waitUntil: vi.fn() });
    expect(response?.status).toBe(206);
    expect(response?.body).toBe(body);
    expect(response?.headers.get("Content-Range")).toBe("bytes 2-5/10");
    expect(response?.headers.get("Content-Length")).toBe("4");
    expect(response?.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(await response?.text()).toBe("2345");
    expect(bucket.get).toHaveBeenCalledWith("video.mp4", { range: { offset: 2, length: 4 } });
  });
});
