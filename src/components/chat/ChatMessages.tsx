"use client";

import { useEffect, useRef, useState, memo } from "react";
import Markdown from "react-markdown";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const blockVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 1 } },
};

const AssistantMessage = memo(function AssistantMessage({
  content,
  animate,
}: {
  content: string;
  animate: boolean;
}) {
  const [shouldAnimate] = useState(animate);

  if (!shouldAnimate) {
    return (
      <Markdown className="chat-markdown">{content}</Markdown>
    );
  }

  return (
    <motion.div
      className="chat-markdown"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
    >
      <Markdown
        components={{
          p: ({ children }: { children: React.ReactNode }) => (
            <motion.p className="mb-1.5 last:mb-0" variants={blockVariants}>
              {children}
            </motion.p>
          ),
          ul: ({ children }: { children: React.ReactNode }) => (
            <motion.ul className="ml-4 list-disc space-y-0.5" variants={blockVariants}>
              {children}
            </motion.ul>
          ),
          ol: ({ children }: { children: React.ReactNode }) => (
            <motion.ol className="ml-4 list-decimal space-y-0.5" variants={blockVariants}>
              {children}
            </motion.ol>
          ),
        }}
      >
        {content}
      </Markdown>
    </motion.div>
  );
}, (prev, next) => prev.content === next.content);

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
  loading,
}: {
  messages: Message[];
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    prevCountRef.current = messages.length;
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          블로그에 대해 무엇이든 물어보세요!
        </p>
      )}
      <div className="flex flex-col gap-3">
        {messages.map((msg, i) => {
          const isNewAssistant =
            msg.role === "assistant" &&
            msg.content !== "" &&
            i === messages.length - 1;

          return (
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
                msg.role === "assistant" && !msg.content && "w-fit",
              )}
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <AssistantMessage
                    content={msg.content}
                    animate={isNewAssistant}
                  />
                ) : (
                  <TypingDots />
                )
              ) : (
                msg.content
              )}
            </motion.div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
