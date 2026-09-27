import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  rag: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: h.env }) }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: h.create }; } }));
vi.mock("@/lib/rag", () => ({
  findRelevantChunks: h.rag,
  buildRagContext: (chunks: unknown[]) => chunks.length ? "게시글 근거" : "",
  getRagSources: (chunks: unknown[]) => chunks.length ? [{ title: "테스트 글", url: "/posts/test" }] : [],
}));
const result = (choices: Record<string, string>) => Response.json({ model: "jev-1.13.0", answers: Object.fromEntries(
  Object.entries(choices).map(([id, choice]) => [id, { type: "choice", choice, confidence: 1,
    probabilities: Object.fromEntries(["needed", "not_needed", "uncertain"].map(label => [label, label === choice ? 1 : 0])) }]),
) });
const messages = [{ role: "user", content: "이 블로그 코드와 관련 글을 알려줘" }];
const request = (signal?: AbortSignal) => new Request("https://blog.example/api/chat", { method: "POST", body: JSON.stringify({ messages }), signal });

beforeEach(() => {
  vi.resetModules();
  h.env = { ANTHROPIC_API_KEY: "mock" };
  h.rag.mockReset().mockResolvedValue([{}]);
  h.create.mockReset().mockImplementation(async function* () {
    yield { type: "content_block_delta", delta: { type: "text_delta", text: "답변" } };
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("chat route context selection", () => {
  it("default off preserves all context, streaming and source headers without a Jev call", async () => {
    const fetchMock = vi.fn(async () => new Response("코드 근거"));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(await response.text()).toBe("답변");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(JSON.parse(decodeURIComponent(response.headers.get("x-chat-sources")!))).toEqual([{ title: "테스트 글", url: "/posts/test" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(h.rag).toHaveBeenCalledTimes(1);
    expect(h.create.mock.calls[0][0].system).toHaveLength(4);
  });

  it("enforce can retain code and posts together while excluding only author context", async () => {
    h.env = { ...h.env, TYPESAFE_API_KEY: "mock", JEV_CHAT_MODE: "enforce", JEV_CONTEXT_EXCLUSION_THRESHOLD: "0.9" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("codebase-summary") ? new Response("코드 근거") : result({ about: "not_needed", code: "needed", posts: "needed" })));
    const { POST } = await import("./route");
    const response = await POST(request()); await response.text();
    expect(h.rag).toHaveBeenCalledTimes(1);
    const texts = h.create.mock.calls[0][0].system.map((block: { text: string }) => block.text);
    expect(texts).toHaveLength(3);
    expect(texts.join(" ")).toContain("코드 근거");
    expect(texts.join(" ")).toContain("게시글 근거");
    expect(texts.join(" ")).not.toContain("[경력]");
  });

  it("author-only skips code fetch and RAG without changing the response contract", async () => {
    h.env = { ...h.env, TYPESAFE_API_KEY: "mock", JEV_CHAT_MODE: "enforce", JEV_CONTEXT_EXCLUSION_THRESHOLD: "0.9" };
    const fetchMock = vi.fn(async () => result({ about: "needed", code: "not_needed", posts: "not_needed" }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    const response = await POST(request()); expect(await response.text()).toBe("답변");
    expect(h.rag).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("x-chat-sources")).toBe(encodeURIComponent("[]"));
    expect(h.create.mock.calls[0][0].system).toHaveLength(2);
  });

  it.each(["shadow", "malformed"])("%s preserves the existing full context", async (mode) => {
    h.env = { ...h.env, TYPESAFE_API_KEY: "mock", JEV_CHAT_MODE: mode === "shadow" ? "shadow" : "enforce", JEV_CONTEXT_EXCLUSION_THRESHOLD: "0.9" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("codebase-summary") ? new Response("코드 근거") : mode === "shadow" ? result({ about: "needed", code: "not_needed", posts: "not_needed" }) : Response.json({ answers: {} })));
    const { POST } = await import("./route");
    const response = await POST(request()); await response.text();
    expect(h.rag).toHaveBeenCalledTimes(1);
    expect(h.create.mock.calls[0][0].system).toHaveLength(4);
  });

  it("an aborted request starts no provider, RAG or summary work", async () => {
    h.env = { ...h.env, TYPESAFE_API_KEY: "mock", JEV_CHAT_MODE: "shadow" };
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");
    expect((await POST(request(AbortSignal.abort()))).status).toBe(499);
    expect(fetchMock).not.toHaveBeenCalled(); expect(h.rag).not.toHaveBeenCalled(); expect(h.create).not.toHaveBeenCalled();
  });
});
