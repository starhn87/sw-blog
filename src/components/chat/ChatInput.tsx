"use client";

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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) onSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 border-t border-border p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "답변 생성 중..." : "질문을 입력하세요..."}
        readOnly={disabled}
        className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
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
