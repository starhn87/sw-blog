"use client";

import { useEffect, useState, useCallback } from "react";
import type { Comment } from "./comments/types";
import { CommentForm } from "./comments/CommentForm";
import { CommentItem } from "./comments/CommentItem";

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
