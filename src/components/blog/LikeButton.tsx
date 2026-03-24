"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function LikeButton({ slug }: { slug: string }) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/likes?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        const { count, liked } = data as { count: number; liked: boolean };
        setCount(count);
        setLiked(liked);
      });
  }, [slug]);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);

    setLiked(!liked);
    setCount((c) => c + (liked ? -1 : 1));

    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = (await res.json()) as { count: number; liked: boolean };
    setCount(data.count);
    setLiked(data.liked);
    setLoading(false);
  };

  return (
    <button
      onClick={handleLike}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      <Heart
        size={16}
        className={cn(
          "transition-colors",
          liked ? "fill-red-500 text-red-500" : "text-muted-foreground",
        )}
      />
      <span>{count}</span>
    </button>
  );
}
