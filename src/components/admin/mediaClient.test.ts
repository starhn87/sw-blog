import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteMedia,
  listMedia,
  MediaApiError,
  renameMediaFile,
  renameMediaFolder,
  saveMediaOrder,
  uploadMedia,
} from "./mediaClient";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(null));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mediaClient", () => {
  it("lists a folder with the admin password", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      folders: ["trips/2026"],
      items: [{ key: "trips/map.webp", size: 10, uploaded: "2026-09-06" }],
    }));

    await expect(listMedia("secret", "trips/2026")).resolves.toEqual({
      folders: ["trips/2026"],
      items: [{ key: "trips/map.webp", size: 10, uploaded: "2026-09-06" }],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/media?list=1&folder=trips%2F2026");
    expect(new Headers(init?.headers).get("x-admin-password")).toBe("secret");
  });

  it("uploads FormData without setting its Content-Type boundary", async () => {
    const formData = new FormData();
    formData.append("files", new Blob(["image"]), "image.webp");

    await uploadMedia("secret", formData);

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(formData);
    expect(headers.get("x-admin-password")).toBe("secret");
    expect(headers.has("Content-Type")).toBe(false);
  });

  it.each([
    {
      name: "deletes selected media",
      request: () => deleteMedia("secret", { keys: ["a.webp"], folders: ["trips"] }),
      method: "DELETE",
      body: { keys: ["a.webp"], folders: ["trips"] },
    },
    {
      name: "renames a file",
      request: () => renameMediaFile("secret", "a.webp", "b.webp"),
      method: "PUT",
      body: { renameFile: { from: "a.webp", to: "b.webp" } },
    },
    {
      name: "renames a folder",
      request: () => renameMediaFolder("secret", "before", "after"),
      method: "PUT",
      body: { renameFolder: { from: "before", to: "after" } },
    },
    {
      name: "saves media order",
      request: () => saveMediaOrder("secret", "trips", ["b.webp", "a.webp"]),
      method: "PUT",
      body: { folder: "trips", order: ["b.webp", "a.webp"] },
    },
  ])("$name as authenticated JSON", async ({ request, method, body }) => {
    await request();

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe(method);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("x-admin-password")).toBe("secret");
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it("throws a typed error for an unsuccessful response", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(listMedia("wrong-password")).rejects.toEqual(
      new MediaApiError(401),
    );
  });
});
