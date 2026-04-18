"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-brand"
        aria-label="링크 복사"
      >
        <span
          className="block transition-transform duration-150"
          style={{ transform: copied ? "scale(0)" : "scale(1)" }}
        >
          <Share2 size={16} />
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
          style={{ transform: copied ? "scale(1)" : "scale(0)" }}
        >
          <Check size={16} className="text-brand" />
        </span>
      </button>
      <div
        className="absolute bottom-full right-0 mb-1 flex flex-col items-center transition-all duration-150"
        style={{
          opacity: copied ? 1 : 0,
          transform: copied ? "translateY(0)" : "translateY(6px)",
          pointerEvents: copied ? "auto" : "none",
        }}
      >
        <span className="whitespace-nowrap rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
          링크 복사 완료!
        </span>
      </div>
    </div>
  );
}
