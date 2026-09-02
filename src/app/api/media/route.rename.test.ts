import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

const bucket = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { MEDIA: bucket, ADMIN_PASSWORD: "test" } }),
}));

const objects = new Map<string, { content: string; httpMetadata: { contentType: string } }>();
function seed(key: string, content: string) {
  objects.set(key, { content, httpMetadata: { contentType: key.endsWith(".json") ? "application/json" : "image/jpeg" } });
}
function rename(from: string, to: string) {
  return PUT(new Request("https://example.test/api/media", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-password": "test" },
    body: JSON.stringify({ renameFolder: { from, to } }),
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  objects.clear();
  bucket.list.mockImplementation(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
    const keys = [...objects.keys()].filter((key) => key.startsWith(prefix)).sort();
    const offset = Number(cursor ?? 0);
    return {
      objects: keys.slice(offset, offset + 2).map((key) => ({ key })),
      delimitedPrefixes: [],
      truncated: offset + 2 < keys.length,
      cursor: String(offset + 2),
    };
  });
  bucket.get.mockImplementation(async (key: string) => {
    const data = objects.get(key);
    return data ? {
      httpMetadata: data.httpMetadata,
      json: async () => JSON.parse(data.content),
      arrayBuffer: async () => new TextEncoder().encode(data.content).buffer,
    } : null;
  });
  bucket.put.mockImplementation(async (key: string, content: string | ArrayBuffer, metadata: { httpMetadata: { contentType: string } }) => {
    objects.set(key, {
      content: typeof content === "string" ? content : new TextDecoder().decode(content),
      httpMetadata: metadata.httpMetadata,
    });
  });
  bucket.delete.mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => objects.delete(key));
  });
});

describe("media folder rename", () => {
  it("rewrites order keys in both the folder and nested folders", async () => {
    seed("trip/a.jpg", "a");
    seed("trip/b.jpg", "b");
    seed("trip/.order.json", JSON.stringify(["trip/b.jpg", "trip/a.jpg", "trip-other/keep.jpg"]));
    seed("trip/day/c.jpg", "c");
    seed("trip/day/.order.json", JSON.stringify(["trip/day/c.jpg"]));
    seed("trip-other/keep.jpg", "keep");

    expect((await rename("trip", "여행")).status).toBe(200);
    expect(JSON.parse(objects.get("여행/.order.json")!.content)).toEqual([
      "여행/b.jpg", "여행/a.jpg", "trip-other/keep.jpg",
    ]);
    expect(JSON.parse(objects.get("여행/day/.order.json")!.content)).toEqual(["여행/day/c.jpg"]);
    expect(objects.get("여행/.order.json")!.httpMetadata.contentType).toBe("application/json");
    expect(objects.get("여행/a.jpg")).toEqual({ content: "a", httpMetadata: { contentType: "image/jpeg" } });
    expect([...objects.keys()].some((key) => key.startsWith("trip/"))).toBe(false);
    expect(objects.has("trip-other/keep.jpg")).toBe(true);
  });

  it("preserves folders without an order file", async () => {
    seed("trip/a.jpg", "a");
    expect((await rename("trip", "new")).status).toBe(200);
    expect([...objects.keys()]).toEqual(["new/a.jpg"]);
  });

  it("rejects an existing destination without changing either folder", async () => {
    seed("trip/a.jpg", "a");
    seed("new/b.jpg", "b");
    expect((await rename("trip", "new")).status).toBe(409);
    expect(bucket.put).not.toHaveBeenCalled();
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
