"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
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
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-auto bg-foreground text-background"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {msg.role === "assistant" ? (
              <AnimatePresence mode="wait">
                {msg.content ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="chat-markdown"
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <motion.div
                    key="typing"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              msg.content
            )}
          </motion.div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
