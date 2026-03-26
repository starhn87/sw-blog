"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Pencil,
  Trash2,
  CornerDownRight,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: number;
  slug: string;
  author: string;
  content: string;
  createdAt: string;
  parentId: number | null;
}

function CommentForm({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !password.trim() || !content.trim() || submitting)
      return;

    setSubmitting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        author,
        content,
        password,
        parentId: parentId ?? undefined,
      }),
    });
    setContent("");
    onSubmitted();
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-2 text-base outline-none focus:border-foreground/30"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-2 text-base outline-none focus:border-foreground/30"
        />
      </div>
      <textarea
        placeholder={parentId ? "답글을 남겨주세요" : "댓글을 남겨주세요"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none rounded-lg border border-border bg-background px-4 py-2 text-base outline-none focus:border-foreground/30"
      />
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

function PasswordModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: "edit" | "delete";
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
      >
        <p className="mb-4 text-sm font-medium">
          {action === "delete" ? "삭제" : "수정"}하려면 비밀번호를 입력하세요
        </p>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && password.trim()) onConfirm(password);
          }}
          autoFocus
          className="mb-4 w-full rounded-lg border border-border bg-background px-4 py-2 text-base outline-none focus:border-foreground/30"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
          <button
            onClick={() => password.trim() && onConfirm(password)}
            disabled={!password.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            확인
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CommentContent({ content }: { content: string }) {
  const match = content.match(/^(\S+님)\s/);
  if (!match) return <>{content}</>;

  return (
    <>
      <span className="font-semibold text-foreground">{match[1]}</span>
      {content.slice(match[1].length)}
    </>
  );
}

function CommentLikeButton({ commentId }: { commentId: number }) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/comments/likes?commentId=${commentId}`)
      .then((r) => r.json())
      .then((data) => {
        const { count, liked } = data as { count: number; liked: boolean };
        setCount(count);
        setLiked(liked);
      })
      .catch(() => {});
  }, [commentId]);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));

    const res = await fetch("/api/comments/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    const data = (await res.json()) as { count: number; liked: boolean };
    setCount(data.count);
    setLiked(data.liked);
    setLoading(false);
  };

  return (
    <button
      onClick={handleLike}
      className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="좋아요"
    >
      <Heart
        size={14}
        className={cn(
          "transition-colors",
          liked && "fill-red-500 text-red-500",
        )}
      />
      {count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
}

function CommentItem({
  comment,
  replies,
  slug,
  onRefresh,
  rootId,
}: {
  comment: Comment;
  replies: Comment[];
  slug: string;
  onRefresh: () => void;
  rootId: number;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [modal, setModal] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState("");

  const handleEdit = async (password: string) => {
    const res = await fetch("/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, content: editContent, password }),
    });
    if (!res.ok) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }
    setModal(null);
    setEditOpen(false);
    setError("");
    onRefresh();
  };

  const handleDelete = async (password: string) => {
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, password }),
    });
    if (!res.ok) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }
    setModal(null);
    setError("");
    onRefresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.author}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CommentLikeButton commentId={comment.id} />
            <button
              onClick={() => setReplyOpen(!replyOpen)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="답글"
            >
              <MessageSquare size={14} />
            </button>
            <button
              onClick={() => {
                setEditContent(comment.content);
                setEditOpen(!editOpen);
              }}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => {
                setError("");
                setModal("delete");
              }}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {editOpen ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-border bg-background px-4 py-2 text-base outline-none focus:border-foreground/30"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setError("");
                  setModal("edit");
                }}
                disabled={!editContent.trim()}
                className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                수정
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
            <CommentContent content={comment.content} />
          </p>
        )}
      </div>

      {/* 대댓글 */}
      {replies.length > 0 && (
        <div className="ml-3 mt-2 flex flex-col gap-2 border-l-2 border-border pl-3 sm:ml-6 sm:pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              slug={slug}
              onRefresh={onRefresh}
              rootId={rootId}
            />
          ))}
        </div>
      )}

      {/* 답글 폼 */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-3 mt-2 overflow-hidden border-l-2 border-border pl-3 sm:ml-6 sm:pl-4"
          >
            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CornerDownRight size={12} />
              <span>{comment.author}에게 답글</span>
            </div>
            <CommentForm
              slug={slug}
              parentId={rootId}
              defaultContent={`${comment.author}님 `}
              onSubmitted={() => {
                setReplyOpen(false);
                onRefresh();
              }}
              onCancel={() => setReplyOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 비밀번호 모달 */}
      <AnimatePresence>
        {modal && (
          <PasswordModal
            action={modal}
            onConfirm={modal === "edit" ? handleEdit : handleDelete}
            onCancel={() => {
              setModal(null);
              setError("");
            }}
          />
        )}
      </AnimatePresence>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </motion.div>
  );
}

export function CommentSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = useCallback(() => {
    fetch(`/api/comments?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setComments(data as Comment[]));
  }, [slug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const topLevel = comments
    .filter((c) => !c.parentId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const getReplies = (parentId: number) =>
    comments
      .filter((c) => c.parentId === parentId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

  return (
    <section className="mt-16 border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-semibold">
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="mb-8">
        <CommentForm slug={slug} onSubmitted={fetchComments} />
      </div>

      <div className="flex flex-col gap-4">
        {topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={getReplies(comment.id)}
            slug={slug}
            onRefresh={fetchComments}
            rootId={comment.id}
          />
        ))}
      </div>
    </section>
  );
}
