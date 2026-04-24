"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { Comment } from "./comments/types";
import { CommentForm } from "./comments/CommentForm";
import { CommentItem } from "./comments/CommentItem";

export default function CommentSection({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = () => {
    fetch(`/api/comments?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setComments(data as Comment[]));
  };

  useEffect(() => {
    fetchComments();
  }, [slug]);

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
    <section id="comments" className="mt-16 border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-semibold">
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="mb-8">
        <CommentForm slug={slug} onSubmitted={fetchComments} />
      </div>

      {topLevel.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <MessageSquare size={40} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">아직 댓글이 없어요. 첫 번째 댓글을 남겨보세요!</p>
        </div>
      ) : (
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
      )}
    </section>
  );
}
