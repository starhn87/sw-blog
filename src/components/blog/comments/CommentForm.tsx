"use client";

import { useState, type FormEvent } from "react";
import { useMentionEditor } from "@/hooks/useMentionEditor";

export function CommentForm({
  slug,
  parentId,
  defaultContent,
  onSubmitted,
  onCancel,
}: {
  slug: string;
  parentId?: number;
  defaultContent?: string;
  onSubmitted: () => void;
  onCancel?: () => void;
}) {
  const [author, setAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState(defaultContent ?? "");
  const [submitting, setSubmitting] = useState(false);
  const editor = useMentionEditor();

  const useRichEditor = !!defaultContent?.match(/^(\S+님)\s/);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = useRichEditor ? editor.getText() : content.trim();
    if (!author.trim() || !password.trim() || !text || submitting) return;

    setSubmitting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        author,
        content: text,
        password,
        parentId: parentId ?? undefined,
      }),
    });
    setAuthor("");
    setPassword("");
    setContent("");
    editor.clear();
    onSubmitted();
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">이름</span>
          <input
            type="text"
            placeholder="이름"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            autoFocus={!!parentId}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="sr-only">비밀번호</span>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
          />
        </label>
      </div>
      {useRichEditor ? (
        <div
          ref={editor.initRef(defaultContent!)}
          contentEditable
          role="textbox"
          aria-label="답글"
          onInput={() => setContent(editor.handleInput())}
          className="min-h-[4.5rem] w-full whitespace-pre-wrap rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
        />
      ) : (
        <label>
          <span className="sr-only">{parentId ? "답글" : "댓글"}</span>
          <textarea
            placeholder={parentId ? "답글을 남겨주세요" : "댓글을 남겨주세요"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={
            submitting ||
            !author.trim() ||
            !password.trim() ||
            !content.trim()
          }
          className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {submitting ? "작성 중..." : parentId ? "답글 작성" : "댓글 작성"}
        </button>
      </div>
    </form>
  );
}
