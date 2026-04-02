"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Pencil,
  Trash2,
  CornerDownRight,
} from "lucide-react";
import type { Comment } from "./types";
import { CommentContent } from "./CommentContent";
import { CommentLikeButton } from "./CommentLikeButton";
import { CommentForm } from "./CommentForm";
import { PasswordModal } from "./PasswordModal";
import { useMentionEditor } from "@/hooks/useMentionEditor";

export function CommentItem({
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
  const [editText, setEditText] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [modal, setModal] = useState<"edit" | "delete" | null>(null);
  const editor = useMentionEditor();

  const handleVerifyForEdit = async (password: string): Promise<boolean> => {
    const res = await fetch("/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, content: comment.content, password }),
    });
    if (!res.ok) return false;
    setVerifiedPassword(password);
    setEditText(comment.content);
    setEditOpen(true);
    setModal(null);
    return true;
  };

  const handleEditSubmit = async () => {
    const text = editor.getText();
    if (!verifiedPassword || !text) return;
    await fetch("/api/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, content: text, password: verifiedPassword }),
    });
    setEditOpen(false);
    setVerifiedPassword(null);
    onRefresh();
  };

  const handleDelete = async (password: string): Promise<boolean> => {
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id, password }),
    });
    if (!res.ok) return false;
    setModal(null);
    onRefresh();
    return true;
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
              onClick={() => setModal("edit")}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setModal("delete")}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {editOpen ? (
          <div className="flex flex-col gap-2">
            <div
              ref={editor.initRef(comment.content, true)}
              contentEditable
              role="textbox"
              aria-label="댓글 수정"
              onInput={() => setEditText(editor.handleInput())}
              className="min-h-[4.5rem] whitespace-pre-wrap rounded-lg border border-border bg-background px-4 py-2 text-base outline-hidden focus:border-foreground/30"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setVerifiedPassword(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editText || editText === comment.content}
                className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                저장
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
            onConfirm={modal === "edit" ? handleVerifyForEdit : handleDelete}
            onCancel={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
