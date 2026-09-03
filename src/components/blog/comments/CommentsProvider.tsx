"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { invalidatePostStats } from "@/lib/postStats";
import type { Comment } from "./types";

const CommentsContext = createContext<{
  comments: Comment[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  createComment: (draft: { author: string; content: string; password: string; parentId?: number }) => Promise<void>;
  confirmEdit: (id: number, content: string) => void;
  confirmDelete: (id: number) => void;
} | null>(null);

export function CommentsProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pending, setPending] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const nextId = useRef(0);

  const reload = useCallback(async () => {
    const version = ++revision.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("Comment fetch failed");
      const data = await res.json() as Comment[];
      if (version === revision.current) setComments(data);
    } catch {
      if (version === revision.current) setError("댓글을 불러오지 못했어요.");
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void reload();
    return () => { revision.current += 1; };
  }, [reload]);

  const createComment = async (draft: { author: string; content: string; password: string; parentId?: number }) => {
    const id = --nextId.current;
    revision.current += 1;
    setPending((current) => [...current, {
      id, slug, author: draft.author.trim(), content: draft.content.trim(),
      parentId: draft.parentId ?? null, createdAt: new Date().toISOString(),
      likeCount: 0, liked: false, pending: true,
    }]);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, slug }),
      });
      if (!res.ok) throw new Error("Comment creation failed");
      const created = await res.json() as Omit<Comment, "likeCount" | "liked" | "pending">;
      setComments((current) => [...current, { ...created, likeCount: 0, liked: false }]);
      invalidatePostStats("comments");
    } finally {
      setPending((current) => current.filter((comment) => comment.id !== id));
    }
  };

  const confirmEdit = (id: number, content: string) => {
    revision.current += 1;
    setComments((current) => current.map((comment) => comment.id === id ? { ...comment, content } : comment));
  };

  const confirmDelete = (id: number) => {
    revision.current += 1;
    setComments((current) => current.filter((comment) => comment.id !== id && comment.parentId !== id));
    invalidatePostStats("comments");
  };

  return <CommentsContext.Provider value={{
    comments: [...comments, ...pending], loading, error, reload, createComment, confirmEdit, confirmDelete,
  }}>{children}</CommentsContext.Provider>;
}

export function useComments() {
  const context = useContext(CommentsContext);
  if (!context) throw new Error("CommentsProvider is required");
  return context;
}
