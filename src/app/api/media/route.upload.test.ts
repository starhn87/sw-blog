import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const bucket = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: { MEDIA: bucket, ADMIN_PASSWORD: "test" },
  }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  bucket.put.mockResolvedValue({});
});

describe("media upload", () => {
  it("passes uploaded files directly to R2 without making an ArrayBuffer copy", async () => {
    const formData = new FormData();
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    formData.append("files", file);

    const response = await POST(new Request("https://example.test/api/media", {
      method: "POST",
      headers: { "x-admin-password": "test" },
      body: formData,
    }));

    expect(response.status).toBe(200);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    const [, body, options] = bucket.put.mock.calls[0];
    expect(body).toBeInstanceOf(Blob);
    expect(await body.text()).toBe("image");
    expect(options).toEqual({ httpMetadata: { contentType: "image/jpeg" } });
  });
});
