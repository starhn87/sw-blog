"use client";

import dynamic from "next/dynamic";
import { Eye } from "lucide-react";

export default dynamic(() => import("@/components/blog/ViewCounter"), {
  ssr: false,
  loading: () => (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Eye size={14} />
      -
    </span>
  ),
});
