"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessages({
  messages,
  streaming,
}: {
  messages: Message[];
  streaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          블로그에 대해 무엇이든 물어보세요!
        </p>
      )}
      <div className="flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-auto bg-foreground text-background"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {msg.content}
          </div>
        ))}
        {streaming && (
          <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            <span className="animate-pulse">...</span>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
