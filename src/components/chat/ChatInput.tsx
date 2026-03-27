"use client";

import { useRef, useEffect } from "react";
import { Send } from "lucide-react";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "답변 생성 중..." : "질문을 입력하세요..."}
        readOnly={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-base leading-snug outline-hidden placeholder:text-muted-foreground"
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
