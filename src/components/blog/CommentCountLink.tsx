"use client";

import { MessageSquare } from "lucide-react";
import { useComments } from "./comments/CommentsProvider";

export default function CommentCountLink() {
  const { comments } = useComments();
  const count = comments.length;
  if (count === 0) return null;

  const handleClick = () => {
    document
      .getElementById("comments")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <span>&middot;</span>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`댓글 ${count}개, 댓글 섹션으로 이동`}
        className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare size={14} />
        {count}
      </button>
    </>
  );
}
