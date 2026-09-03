// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

const fixtures = vi.hoisted(() => ({ items: [{ key: "a.jpg", size: 1 }, { key: "b.jpg", size: 1 }] }));
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/components/admin/AdminAuth", () => ({
  AdminAuth: ({ onLogin }: { onLogin: (password: string, data: unknown) => void }) =>
    <button type="button" onClick={() => onLogin("test-password", { items: fixtures.items, folders: ["other"] })}>로그인</button>,
}));
vi.mock("@/components/admin/PushSubscribeButton", () => ({ default: () => null }));
vi.mock("@/components/admin/SortableMediaItem", () => ({
  SortableMediaItem: ({ item }: { item: { key: string } }) => <span data-testid="media">{item.key}</span>,
}));
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (event: unknown) => void }) => <div>
    <button type="button" onClick={() => onDragEnd({ active: { id: "a.jpg" }, over: { id: "b.jpg" } })}>순서 변경</button>
    {children}
  </div>,
  closestCenter: vi.fn(), PointerSensor: vi.fn(), useSensor: vi.fn(), useSensors: vi.fn(),
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => children,
  rectSortingStrategy: vi.fn(),
}));

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(Response.json({ items: fixtures.items, folders: ["other"] }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function login() {
  render(<AdminPage />);
  await act(async () => { fireEvent.click(screen.getByText("로그인")); });
}

describe("optimistic media order", () => {
  it.each(["http", "network"])("restores the order on %s failure and allows a retry", async (failure) => {
    await login();
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByText("순서 변경"));
    expect(screen.getAllByTestId("media").map((item) => item.textContent)).toEqual(["b.jpg", "a.jpg"]);
    fireEvent.click(screen.getByText("순서 변경"));
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(1);
    await act(async () => {
      if (failure === "http") pending.resolve(Response.json({}, { status: 503 }));
      else pending.reject(new TypeError("offline"));
    });
    expect(screen.getAllByTestId("media").map((item) => item.textContent)).toEqual(["a.jpg", "b.jpg"]);
    expect(screen.getByRole("alert").textContent).toContain("저장하지 못했어요");
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    await act(async () => { fireEvent.click(screen.getByText("순서 변경")); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByTestId("media").map((item) => item.textContent)).toEqual(["b.jpg", "a.jpg"]);
  });

  it("does not restore a previous folder after navigation while saving", async () => {
    await login();
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByText("순서 변경"));
    fetchMock.mockResolvedValueOnce(Response.json({ items: [{ key: "other/c.jpg", size: 1 }], folders: [] }));
    await act(async () => { fireEvent.click(screen.getByText("other")); });
    await act(async () => { pending.resolve(Response.json({}, { status: 503 })); });
    expect(screen.getAllByTestId("media").map((item) => item.textContent)).toEqual(["other/c.jpg"]);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
