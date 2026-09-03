// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLikeToggle } from "./useLikeToggle";
import LikeButton from "@/components/blog/LikeButton";
import { CommentLikeButton } from "@/components/blog/comments/CommentLikeButton";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("optimistic likes", () => {
  it.each(["post", "comment"])("shows a visible error on the %s like button", async (kind) => {
    fetchMock.mockImplementation(async (_url, options) => options?.method === "POST"
      ? Response.json({}, { status: 503 })
      : Response.json({ count: 2, liked: false }));
    render(kind === "post" ? <LikeButton slug="post" /> : <CommentLikeButton commentId={1} initialCount={2} initialLiked={false} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain("실패");
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
  });

  it("updates immediately, blocks overlapping toggles, and accepts the server count", async () => {
    const response = Promise.withResolvers<Response>();
    fetchMock.mockReturnValue(response.promise);
    const { result } = renderHook(() => useLikeToggle(null, "/api/likes", { slug: "post" }, { count: 3, liked: false }));
    let request!: Promise<void>;
    act(() => {
      request = result.current.toggle();
      void result.current.toggle();
    });
    expect(result.current.count).toBe(4);
    expect(result.current.liked).toBe(true);
    expect(result.current.loading).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      response.resolve(Response.json({ count: 7, liked: true }));
      await request;
    });
    expect(result.current.count).toBe(7);
    expect(result.current.loading).toBe(false);
  });

  it.each(["http", "network"])("rolls back a %s failure and clears the error on retry", async (failure) => {
    if (failure === "http") fetchMock.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    else fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const { result } = renderHook(() => useLikeToggle(null, "/api/comments/likes", { commentId: 1 }, { count: 2, liked: true }));
    await act(async () => { await result.current.toggle(); });
    expect(result.current.count).toBe(2);
    expect(result.current.liked).toBe(true);
    expect(result.current.error).toContain("실패");
    fetchMock.mockResolvedValueOnce(Response.json({ count: 1, liked: false }));
    await act(async () => { await result.current.toggle(); });
    expect(result.current.count).toBe(1);
    expect(result.current.error).toBe("");
  });

  it("does not overwrite a successful toggle with a late initial read", async () => {
    const initial = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(initial.promise).mockResolvedValueOnce(Response.json({ count: 8, liked: true }));
    const { result } = renderHook(() => useLikeToggle("/api/likes?slug=post", "/api/likes", { slug: "post" }));
    await act(async () => { await result.current.toggle(); });
    await act(async () => {
      initial.resolve(Response.json({ count: 7, liked: false }));
      await initial.promise;
    });
    expect(result.current.count).toBe(8);
    expect(result.current.liked).toBe(true);
  });
});
