"use client";

import { useState, useRef, useEffect } from "react";
import { PostCard } from "./PostCard";
import type { Post } from "@/types";

const BATCH = 5;

export function PaginatedPosts({
  posts,
  storageKey,
}: {
  posts: Post[];
  storageKey?: string;
}) {
  const [visible, setVisible] = useState(BATCH);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 뒤로가기로 재마운트되면 visible이 BATCH로 리셋돼 콘텐츠 높이가 줄고,
  // 브라우저가 복원한 스크롤 위치에서 sentinel이 뷰포트 밖으로 밀려 무한 스크롤이 멈춘다.
  // 이전에 펼친 개수를 복원해 높이를 되돌린다.
  useEffect(() => {
    if (!storageKey) return;
    const saved = Number(sessionStorage.getItem(storageKey));
    if (saved > BATCH) setVisible(Math.min(saved, posts.length));
  }, [storageKey, posts.length]);

  useEffect(() => {
    if (storageKey) sessionStorage.setItem(storageKey, String(visible));
  }, [storageKey, visible]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible((prev) => Math.min(prev + BATCH, posts.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [posts.length]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {posts.slice(0, visible).map((post, i) => (
        <div
          key={post.slug}
          style={
            i >= visible - BATCH
              ? {
                  animation: "fade-in-up 0.3s ease-out both",
                  animationDelay: `${(i % BATCH) * 60}ms`,
                }
              : undefined
          }
        >
          <PostCard post={post} priority={i === 0} />
        </div>
      ))}
      {visible < posts.length && <div ref={loaderRef} className="h-1" />}
    </div>
  );
}
