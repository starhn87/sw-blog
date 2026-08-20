"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  trackAnalyticsEvent,
  type AnalyticsSource,
} from "@/lib/analytics";

export function TrackedPostLink({
  slug,
  source,
  className,
  children,
}: {
  slug: string;
  source: AnalyticsSource;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/blog/${slug}`}
      className={className}
      onClick={() =>
        trackAnalyticsEvent({ event: "post_click", slug, source })
      }
    >
      {children}
    </Link>
  );
}
