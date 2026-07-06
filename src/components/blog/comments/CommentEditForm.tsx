"use client";

import { useState } from "react";
import { useMentionEditor } from "@/hooks/useMentionEditor";

export function CommentEditForm({
  comment,
  password,
  onDone,
  onCancel,
}: {
  comment: { id: number; content: string };
  password: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [editText, setEditText] = useState(comment.content);
  const editor = useMentionEditor();

  const handleSubmit = async () => {
    const text = editor.getText();
    if (!text) return;
    await fetch("/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, content: text, password }),
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={editor.initRef(comment.content, true)}
        contentEditable
        role="textbox"
        aria-label="댓글 수정"
        onInput={() => setEditText(editor.handleInput())}
        className="min-h-[4.5rem] whitespace-pre-wrap rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!editText || editText === comment.content}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </div>
  );
}
