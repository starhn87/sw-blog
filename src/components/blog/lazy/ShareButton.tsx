"use client";

import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";

export default dynamic(() => import("@/components/blog/ShareButton"), {
  ssr: false,
  loading: () => (
    <div className="relative">
      <button
        className="rounded-md p-1 text-muted-foreground"
        aria-label="링크 복사"
      >
        <Share2 size={16} />
      </button>
    </div>
  ),
});
