"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommentLikeButton({ commentId }: { commentId: number }) {
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
