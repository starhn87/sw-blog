"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

export function ViewCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/views?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => setCount((data as { count: number }).count));

    if (!sessionStorage.getItem(`viewed-${slug}`)) {
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      sessionStorage.setItem(`viewed-${slug}`, "1");
    }
  }, [slug]);

  if (count === null) return null;

  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Eye size={14} />
      {count}
    </span>
  );
}
