"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMentionEditor } from "@/hooks/useMentionEditor";
import { useComments } from "./CommentsProvider";

export function CommentForm({
  parentId,
  defaultContent,
  onSubmitted,
  onCancel,
}: {
  parentId?: number;
  defaultContent?: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
}) {
  const [author, setAuthor] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState(defaultContent ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const editor = useMentionEditor();
  const pending = useRef(false);
  const { createComment, loading, error: loadError } = useComments();
  const disabled = submitting || loading || !!loadError;

  const useRichEditor = !!defaultContent?.match(/^(\S+님)\s/);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = useRichEditor ? editor.getText() : content.trim();
    if (!author.trim() || !password.trim() || !text || pending.current || disabled) return;

    pending.current = true;
    setSubmitting(true);
    setError("");
    try {
      await createComment({ author, content: text, password, parentId });
      setAuthor("");
      setPassword("");
      setContent("");
      editor.clear();
      onSubmitted?.();
    } catch {
      setError("댓글 전송에 실패했어요. 입력은 유지했으니 등록 여부를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label={parentId ? "답글 작성" : "댓글 작성"} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">이름</span>
          <input
            type="text"
            placeholder="이름"
            value={author}
            disabled={disabled}
            maxLength={50}
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
            disabled={disabled}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
          />
        </label>
      </div>
      {useRichEditor ? (
        <div
          ref={editor.initRef(defaultContent!)}
          contentEditable={!disabled}
          aria-disabled={disabled}
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
            disabled={disabled}
            maxLength={2000}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={
            disabled ||
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
