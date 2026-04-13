import { useEffect, useState } from "react";

export function useLikeToggle(
  fetchUrl: string,
  postUrl: string,
  body: Record<string, unknown>,
) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => {
        const { count, liked } = data as { count: number; liked: boolean };
        setCount(count);
        setLiked(liked);
      })
      .catch(() => {});
  }, [fetchUrl]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));

    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { count: number; liked: boolean };
      setCount(data.count);
      setLiked(data.liked);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  return { count, liked, toggle };
}
