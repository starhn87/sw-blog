import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const bucket = vi.hoisted(() => ({ head: vi.fn(), get: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { MEDIA: bucket } }),
}));

function request(range?: string) {
  return GET(new Request("https://example.test/api/media?key=video.mp4", {
    headers: range ? { Range: range } : {},
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  bucket.head.mockResolvedValue({ size: 10 });
  bucket.get.mockImplementation(async (_key: string, options?: { range: { offset: number; length: number } }) => {
    const data = "0123456789";
    const range = options?.range;
    return {
      size: data.length,
      httpMetadata: { contentType: "video/mp4" },
      body: range ? data.slice(range.offset, range.offset + range.length) : data,
    };
  });
});

describe("media byte ranges", () => {
  it.each([
    ["bytes=2-5", "2345", "bytes 2-5/10", 2, 4],
    ["bytes=6-", "6789", "bytes 6-9/10", 6, 4],
    ["bytes=2-999", "23456789", "bytes 2-9/10", 2, 8],
    ["bytes=-3", "789", "bytes 7-9/10", 7, 3],
    ["bytes=-999", "0123456789", "bytes 0-9/10", 0, 10],
    ["bytes=0-0", "0", "bytes 0-0/10", 0, 1],
  ])("serves %s with exact headers and body", async (range, body, contentRange, offset, length) => {
    const response = await request(range);
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(contentRange);
    expect(response.headers.get("Content-Length")).toBe(String(length));
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(await response.text()).toBe(body);
    expect(bucket.get).toHaveBeenCalledWith("video.mp4", { range: { offset, length } });
  });

  it.each(["bytes=10-", "bytes=20-", "bytes=8-2", "bytes=-0", "bytes=9007199254740992-", "bytes=0-9007199254740992"])(
    "rejects %s before requesting an invalid R2 range", async (range) => {
      const response = await request(range);
      expect(response.status).toBe(416);
      expect(response.headers.get("Content-Range")).toBe("bytes */10");
      expect(bucket.get).not.toHaveBeenCalled();
    },
  );

  it("returns 416 for ranges on an empty object", async () => {
    bucket.head.mockResolvedValue({ size: 0 });
    const response = await request("bytes=0-");
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */0");
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing ranged object", async () => {
    bucket.head.mockResolvedValue(null);
    expect((await request("bytes=0-1")).status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it.each([undefined, "bytes=-", "bytes=abc", "bytes=0-1,4-5", "items=0-1", "bytes=2-5junk"])(
    "serves the full object for absent or unsupported range %s", async (range) => {
      const response = await request(range);
      expect(response.status).toBe(200);
      expect(response.headers.has("Content-Range")).toBe(false);
      expect(await response.text()).toBe("0123456789");
      expect(bucket.head).not.toHaveBeenCalled();
    },
  );
});
