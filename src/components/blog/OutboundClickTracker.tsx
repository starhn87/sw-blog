"use client";

import { useEffect } from "react";
import { ANALYTICS_OUTBOUND_TARGETS, trackAnalyticsEvent } from "@/lib/analytics";

export function OutboundClickTracker({ slug }: { slug: string }) {
  useEffect(() => {
    function trackClick(event: MouseEvent) {
      if (event.defaultPrevented || (event.button !== 0 && event.button !== 1)) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("article .prose a[href]");
      if (!link) return;
      const target = ANALYTICS_OUTBOUND_TARGETS.find((row) => row.href === link.href);
      if (target) trackAnalyticsEvent({ event: "outbound_click", slug, source: target.source });
    }

    document.addEventListener("click", trackClick);
    document.addEventListener("auxclick", trackClick);
    return () => {
      document.removeEventListener("click", trackClick);
      document.removeEventListener("auxclick", trackClick);
    };
  }, [slug]);

  return null;
}
