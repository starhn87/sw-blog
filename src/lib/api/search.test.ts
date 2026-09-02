import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "../workerApi";

const indexFetch = vi.fn();
const run = vi.fn();
const query = vi.fn();
const env = { AI: { run }, VECTORIZE: { query } } as unknown as CloudflareEnv;
const ctx = { waitUntil: vi.fn() };
const posts = [
  { slug: "title", title: "PostGIS", description: "", tags: [], content: "" },
  { slug: "tag", title: "", description: "", tags: ["postgis"], content: "" },
  { slug: "body", title: "", description: "", tags: [], content: "PostGIS" },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", indexFetch);
  indexFetch.mockImplementation(async () => Response.json(posts));
  run.mockResolvedValue({ data: [[1, 2]] });
  query.mockResolvedValue({ matches: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function search(q: string) {
  const response = await handleApiRequest(new Request(`https://example.test/api/search?q=${encodeURIComponent(q)}`), env, ctx);
  expect(response?.headers.get("X-API-Runtime")).toBe("worker");
  return response!.json();
}

describe("native search API", () => {
  it("does not read assets or call AI for an empty query", async () => {
    expect(await search("  ")).toEqual({ results: [] });
    expect(indexFetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("preserves keyword priority, semantic cutoff and deduplication", async () => {
    query.mockResolvedValue({ matches: [
      { id: "title", score: 0.9 }, { id: "semantic", score: 0.5 }, { id: "weak", score: 0.39 },
    ] });
    expect(await search(" PostGIS ")).toEqual({ results: [
      { slug: "title", score: 1 }, { slug: "tag", score: 0.7 },
      { slug: "body", score: 0.2 }, { slug: "semantic", score: 0.5 },
    ] });
    expect(indexFetch).toHaveBeenCalledWith(new URL("https://example.test/search-index.json"));
    expect(run).toHaveBeenCalledWith("@cf/baai/bge-m3", { text: ["PostGIS"] });
    expect(query).toHaveBeenCalledWith([1, 2], { topK: 10, returnMetadata: "all" });
  });

  it("uses the original lower semantic cutoff without keyword matches", async () => {
    query.mockResolvedValue({ matches: [{ id: "semantic", score: 0.3 }, { id: "weak", score: 0.29 }] });
    expect(await search("coordinates")).toEqual({ results: [{ slug: "semantic", score: 0.3 }] });
  });

  it.each(["AI", "Vectorize"])("retains keyword results when %s fails", async (service) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    (service === "AI" ? run : query).mockRejectedValue(new Error("Service unavailable"));
    expect(await search("postgis")).toEqual({ results: [
      { slug: "title", score: 1 }, { slug: "tag", score: 0.7 }, { slug: "body", score: 0.2 },
    ] });
  });
});
