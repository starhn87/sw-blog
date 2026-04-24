"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export default function CommentCountLink({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/comments?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setCount((data as unknown[]).length))
      .catch(() => {});
  }, [slug]);

  if (count === null || count === 0) return null;

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
