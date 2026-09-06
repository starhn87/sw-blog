// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuth } from "./AdminAuth";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminAuth", () => {
  it("returns the initial media list after authentication", async () => {
    const onLogin = vi.fn();
    const data = {
      folders: ["trips"],
      items: [{ key: "map.webp", size: 10, uploaded: "2026-09-06" }],
    };
    fetchMock.mockResolvedValueOnce(Response.json(data));
    render(<AdminAuth onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText("관리자 비밀번호"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith("secret", data));
    expect(localStorage.getItem("is-admin")).toBe("true");
  });

  it.each([
    { status: 401, message: "비밀번호가 일치하지 않아요" },
    { status: 503, message: "로그인을 확인하지 못했어요. 다시 시도해 주세요." },
  ])("shows the matching message for a $status response", async ({ status, message }) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    render(<AdminAuth onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("관리자 비밀번호"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByText(message)).toBeTruthy();
  });
});
