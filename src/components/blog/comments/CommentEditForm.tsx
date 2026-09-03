"use client";

import { useRef, useState } from "react";
import { useMentionEditor } from "@/hooks/useMentionEditor";

export function CommentEditForm({
  comment,
  password,
  onDone,
  onCancel,
}: {
  comment: { id: number; content: string };
  password: string;
  onDone: (content: string) => void;
  onCancel: () => void;
}) {
  const [editText, setEditText] = useState(comment.content);
  const editor = useMentionEditor();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  const handleSubmit = async () => {
    const text = editor.getText();
    if (!text || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: comment.id, content: text, password }),
      });
      if (!res.ok) throw new Error("Comment edit failed");
      onDone(text);
    } catch {
      setError("댓글 수정에 실패했어요. 내용을 확인하고 다시 시도해 주세요.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={editor.initRef(comment.content, true)}
        contentEditable={!submitting}
        aria-disabled={submitting}
        role="textbox"
        aria-label="댓글 수정"
        onInput={() => setEditText(editor.handleInput())}
        className="min-h-[4.5rem] whitespace-pre-wrap rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !editText || editText === comment.content}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
