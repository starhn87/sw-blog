// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommentSection from "./CommentSection";
import CommentCountLink from "./CommentCountLink";
import { CommentsProvider } from "./comments/CommentsProvider";
import type { Comment } from "./comments/types";

const existing: Comment = {
  id: 1, slug: "post", author: "독자", content: "기존 댓글", createdAt: "2026-09-03T00:00:00Z",
  parentId: null, likeCount: 0, liked: false,
};
const created = { ...existing, id: 2, author: "새 독자", content: "새 댓글" };
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => Response.json([existing]));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function Thread({ slug = "post" }: { slug?: string }) {
  return <CommentsProvider key={slug} slug={slug}><CommentCountLink /><CommentSection /></CommentsProvider>;
}

async function loadThread() {
  const view = render(<Thread />);
  await screen.findByText("기존 댓글");
  return view;
}

function fillForm(name = "댓글 작성", content = "새 댓글") {
  const form = screen.getByRole("form", { name });
  fireEvent.change(within(form).getByLabelText("이름"), { target: { value: "새 독자" } });
  fireEvent.change(within(form).getByLabelText("비밀번호"), { target: { value: "test-secret" } });
  const editor = within(form).getByRole("textbox", { name: name === "답글 작성" ? "답글" : "댓글" });
  if (editor.tagName === "TEXTAREA") fireEvent.change(editor, { target: { value: content } });
  else fireEvent.input(editor, { target: { textContent: content } });
  return form;
}

function expectCount(count: number) {
  if (count) expect(screen.getByRole("button", { name: `댓글 ${count}개, 댓글 섹션으로 이동` })).toBeTruthy();
  else expect(screen.queryByRole("button", { name: /댓글 \d+개, 댓글 섹션으로 이동/ })).toBeNull();
  expect(screen.getByRole("heading", { name: count ? `댓글 (${count})` : "댓글" })).toBeTruthy();
}

describe("shared optimistic comments", () => {
  it("shares the initial read and confirms a pending comment without refetching", async () => {
    await loadThread();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const form = fillForm();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(screen.getByText("전송 중...")).toBeTruthy();
    expect(screen.getByText("새 댓글", { selector: "p" }).closest("[aria-busy]")?.querySelector("button")).toBeNull();
    expectCount(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toContain("test-secret");
    await act(async () => { pending.resolve(Response.json(created, { status: 201 })); });
    expect(screen.queryByText("전송 중...")).toBeNull();
    expectCount(2);
    expect((within(form).getByLabelText("이름") as HTMLInputElement).value).toBe("");
    expect((within(form).getByLabelText("댓글") as HTMLTextAreaElement).value).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["http", "network"])("rolls back a %s failure but keeps the draft for retry", async (failure) => {
    await loadThread();
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const form = fillForm();
    fireEvent.submit(form);
    expectCount(2);
    await act(async () => {
      if (failure === "http") pending.resolve(Response.json({}, { status: 503 }));
      else pending.reject(new TypeError("offline"));
    });
    expectCount(1);
    expect(screen.getByRole("alert").textContent).toContain("입력은 유지");
    expect((within(form).getByLabelText("비밀번호") as HTMLInputElement).value).toBe("test-secret");
    expect((within(form).getByLabelText("댓글") as HTMLTextAreaElement).value).toBe("새 댓글");
    fetchMock.mockResolvedValueOnce(Response.json(created, { status: 201 }));
    await act(async () => { fireEvent.submit(form); });
    expectCount(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a pending reply under its parent and locks parent deletion until confirmed", async () => {
    await loadThread();
    fireEvent.click(screen.getByRole("button", { name: "답글" }));
    const form = fillForm("답글 작성", "독자님 새 답글");
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.submit(form);
    expectCount(2);
    expect((screen.getByRole("button", { name: "삭제" }) as HTMLButtonElement).disabled).toBe(true);
    expect(JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body)).parentId).toBe(1);
    await act(async () => {
      pending.resolve(Response.json({ ...created, content: "독자님 새 답글", parentId: 1 }, { status: 201 }));
    });
    await waitFor(() => expect(screen.queryByRole("form", { name: "답글 작성" })).toBeNull());
    expect(screen.queryByText("전송 중...")).toBeNull();
    expectCount(2);
  });

  it("does not discard another pending submission when one request fails", async () => {
    await loadThread();
    const first = Promise.withResolvers<Response>();
    const second = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    fireEvent.submit(fillForm());
    fireEvent.click(screen.getByRole("button", { name: "답글" }));
    fireEvent.submit(fillForm("답글 작성", "독자님 새 답글"));
    expectCount(3);
    await act(async () => { first.resolve(Response.json({}, { status: 503 })); });
    expectCount(2);
    expect(screen.getAllByText("전송 중...")).toHaveLength(1);
    await act(async () => { second.resolve(Response.json({ ...created, content: "독자님 새 답글", parentId: 1 }, { status: 201 })); });
    expectCount(2);
  });

  it("preserves the rich reply editor and password after a failed submission", async () => {
    await loadThread();
    fireEvent.click(screen.getByRole("button", { name: "답글" }));
    const form = fillForm("답글 작성", "독자님 새 답글");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await act(async () => { fireEvent.submit(form); });
    expectCount(1);
    expect(within(form).getByRole("textbox", { name: "답글" }).textContent).toBe("독자님 새 답글");
    expect((within(form).getByLabelText("비밀번호") as HTMLInputElement).value).toBe("test-secret");
    expect(within(form).getByRole("alert").textContent).toContain("입력은 유지");
    expect((screen.getByRole("button", { name: "삭제" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("keeps failed edits open and updates the shared list only after a successful retry", async () => {
    await loadThread();
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByPlaceholderText("비밀번호"), { target: { value: "test-secret" } });
    await act(async () => { fireEvent.click(within(modal).getByRole("button", { name: "확인" })); });
    const editor = screen.getByRole("textbox", { name: "댓글 수정" });
    fireEvent.input(editor, { target: { textContent: "수정한 내용" } });
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect((screen.getByRole("button", { name: "저장 중..." }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { pending.resolve(Response.json({}, { status: 500 })); });
    expect(screen.getByRole("textbox", { name: "댓글 수정" }).textContent).toBe("수정한 내용");
    expect(screen.getByRole("alert").textContent).toContain("수정에 실패");
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "저장" })); });
    expect(screen.queryByRole("textbox", { name: "댓글 수정" })).toBeNull();
    expect(screen.getByText("수정한 내용")).toBeTruthy();
    expectCount(1);
    expect(fetchMock.mock.calls.filter(([, options]) => !options?.method)).toHaveLength(1);
  });

  it("waits for deletion success, keeps authentication failures visible, and removes replies from both counts", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([existing, { ...created, parentId: 1 }]));
    await loadThread();
    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);
    const modal = screen.getByRole("dialog");
    fireEvent.change(within(modal).getByPlaceholderText("비밀번호"), { target: { value: "wrong" } });
    fetchMock.mockResolvedValueOnce(Response.json({}, { status: 403 }));
    await act(async () => { fireEvent.click(within(modal).getByRole("button", { name: "확인" })); });
    expect(screen.getByRole("alert").textContent).toContain("비밀번호가 일치하지");
    expectCount(2);
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.click(within(modal).getByRole("button", { name: "확인" }));
    expectCount(2);
    expect((within(modal).getByRole("button", { name: "취소" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { pending.resolve(Response.json({ ok: true })); });
    expectCount(0);
    expect(screen.queryByText("기존 댓글")).toBeNull();
    expect(screen.queryByText("새 댓글")).toBeNull();
  });

  it.each(["http", "network"])("keeps the password dialog and comment after a %s deletion failure", async (failure) => {
    await loadThread();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const modal = screen.getByRole("dialog");
    const password = within(modal).getByPlaceholderText("비밀번호") as HTMLInputElement;
    fireEvent.change(password, { target: { value: "test-secret" } });
    const pending = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    fireEvent.click(within(modal).getByRole("button", { name: "확인" }));
    expect(password.readOnly).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBe(modal);
    await act(async () => {
      if (failure === "http") pending.resolve(Response.json({}, { status: 500 }));
      else pending.reject(new TypeError("offline"));
    });
    expectCount(1);
    expect(screen.getByRole("alert").textContent).toContain("요청을 처리하지 못했어요");
    expect(password.value).toBe("test-secret");
    expect(password.readOnly).toBe(false);
    expect((within(modal).getByRole("button", { name: "확인" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("handles a read failure without treating it as an empty thread", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    render(<Thread />);
    expect((await screen.findByRole("alert")).textContent).toContain("불러오지 못했어요");
    expect(screen.queryByText(/아직 댓글이 없어요/)).toBeNull();
    expect((screen.getByRole("button", { name: "댓글 작성" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" })); });
    expectCount(1);
  });

  it("isolates state when navigating to another post while the old read is pending", async () => {
    const old = Promise.withResolvers<Response>();
    fetchMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(Response.json([]));
    const view = render(<Thread />);
    await act(async () => { view.rerender(<Thread slug="other" />); });
    await act(async () => { old.resolve(Response.json([existing])); });
    expectCount(0);
    expect(screen.queryByText("기존 댓글")).toBeNull();
  });
});
