// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "./useChat";

const frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames.length = 0;
  sessionStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useChat", () => {
  it("adds sources only after the streamed answer finishes appearing", async () => {
    const sources = [{ slug: "postgis-location-search", title: "PostGIS로 위치 검색하기" }];
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("스트리밍 답변"));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, {
      headers: { "X-Chat-Sources": encodeURIComponent(JSON.stringify(sources)) },
    })));

    const { result } = renderHook(() => useChat());
    let send: Promise<void>;
    act(() => { send = result.current.sendMessage("질문"); });
    await act(async () => { await Promise.resolve(); });

    act(() => { frames.shift()?.(0); });
    expect(result.current.messages.at(-1)?.content).toBe("스트리밍 ");
    expect(result.current.messages.at(-1)?.sources).toBeUndefined();

    while (frames.length > 0) {
      act(() => { frames.shift()?.(0); });
    }
    await act(async () => { await send!; });

    expect(result.current.messages.at(-1)?.content).toBe("스트리밍 답변");
    expect(result.current.messages.at(-1)?.sources).toEqual(sources);
  });
});
