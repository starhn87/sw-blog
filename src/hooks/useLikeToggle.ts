import { useEffect, useRef, useState } from "react";
import { invalidatePostStats } from "@/lib/postStats";

export function useLikeToggle(
  fetchUrl: string | null,
  postUrl: string,
  body: Record<string, unknown>,
  initial?: { count: number; liked: boolean },
) {
  const [count, setCount] = useState(initial?.count ?? 0);
  const [liked, setLiked] = useState(initial?.liked ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    if (!fetchUrl) return;
    let active = true;
    const version = revision.current;
    fetch(fetchUrl)
      .then((r) => {
        if (!r.ok) throw new Error("Like fetch failed");
        return r.json();
      })
      .then((data) => {
        if (!active || version !== revision.current) return;
        const { count, liked } = data as { count: number; liked: boolean };
        setCount(count);
        setLiked(liked);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [fetchUrl]);

  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    revision.current += 1;
    setLoading(true);
    setError("");
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));

    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { count: number; liked: boolean };
      if (!res.ok) throw new Error("Like update failed");
      if (postUrl === "/api/likes") invalidatePostStats("likes");
      setCount(data.count);
      setLiked(data.liked);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      setError("좋아요 저장에 실패했어요. 다시 눌러주세요.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  return { count, liked, toggle, loading, error };
}
