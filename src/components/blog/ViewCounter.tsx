"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30분

function shouldCountView(slug: string): boolean {
  const isAdmin = localStorage.getItem("is-admin") === "true";
  const key = `viewed-${slug}`;

  if (isAdmin) {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "true");
    return true;
  }

  const lastViewed = localStorage.getItem(key);
  if (lastViewed && Date.now() - Number(lastViewed) < VIEW_COOLDOWN_MS) {
    return false;
  }
  localStorage.setItem(key, String(Date.now()));
  return true;
}

export default function ViewCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (shouldCountView(slug)) {
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
