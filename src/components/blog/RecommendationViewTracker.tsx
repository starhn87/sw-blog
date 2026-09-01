"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function RecommendationViewTracker({
  children,
  slug,
  source,
}: {
  children: ReactNode;
  slug: string;
  source: "related" | "series";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackAnalyticsEvent({ event: "recommendation_view", slug, source });
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [slug, source]);

  return <div ref={ref}>{children}</div>;
}
