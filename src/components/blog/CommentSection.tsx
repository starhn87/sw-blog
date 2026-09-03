"use client";

import { MessageSquare } from "lucide-react";
import { CommentForm } from "./comments/CommentForm";
import { CommentItem } from "./comments/CommentItem";
import { useComments } from "./comments/CommentsProvider";

export default function CommentSection() {
  const { comments, loading, error, reload } = useComments();

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
    <section id="comments" className="mt-12 border-t border-border pt-8 md:mt-16">
      <h2 className="mb-6 text-xl font-semibold">
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="mb-8">
        <CommentForm />
      </div>

      {loading ? <p role="status" className="text-sm text-muted-foreground">댓글 불러오는 중...</p> : error ? (
        <div className="flex items-center gap-3 text-sm">
          <p role="alert" className="text-destructive">{error}</p>
          <button type="button" onClick={reload} className="underline">다시 불러오기</button>
        </div>
      ) : topLevel.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center md:py-10">
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
              rootId={comment.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
