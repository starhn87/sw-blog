"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

export function EngagedReadTracker({ slug }: { slug: string }) {
  useEffect(() => {
    let tracked = false;
    const timer = window.setTimeout(markEngaged, 30_000);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", checkProgress);
    }

    function markEngaged() {
      if (tracked) return;
      tracked = true;
      trackAnalyticsEvent({ event: "engaged_read", slug });
      cleanup();
    }

    function checkProgress() {
      const prose = document.querySelector<HTMLElement>(".prose");
      if (!prose) return;
      const top = prose.getBoundingClientRect().top + window.scrollY;
      const halfway = top + prose.offsetHeight / 2;
      if (window.scrollY + window.innerHeight >= halfway) markEngaged();
    }

    window.addEventListener("scroll", checkProgress, { passive: true });
    checkProgress();
    return cleanup;
  }, [slug]);

  return null;
}
