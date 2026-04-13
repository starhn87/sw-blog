"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

export default function ViewCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem(`viewed-${slug}`)) {
      sessionStorage.setItem(`viewed-${slug}`, "1");
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
        .then((r) => r.json())
        .then((data) => setCount((data as { count: number }).count));
    } else {
      fetch(`/api/views?slug=${slug}`)
        .then((r) => r.json())
        .then((data) => setCount((data as { count: number }).count));
    }
  }, [slug]);

  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Eye size={14} />
      {count === null ? "-" : count}
    </span>
  );
}
