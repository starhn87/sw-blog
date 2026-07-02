"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatSource } from "@/hooks/useChat";

const SUGGESTED_QUESTIONS = [
  "이 블로그는 어떤 기술로 만들었나요?",
  "AI 챗봇은 어떻게 동작하나요?",
  "어떤 주제의 글들이 있나요?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const blockInitial = { opacity: 0, y: 6 };
const blockAnimate = { opacity: 1, y: 0 };
const blockTransition = { duration: 1, ease: "easeOut" as const };

// 문단(\n\n)으로 먼저 나눈 뒤, 일반 텍스트 문단은 문장(.!?。) 단위로 더 쪼갠다.
// 리스트·코드·헤딩·인용은 구조가 깨지지 않도록 통째로 둔다. 각 조각을 안정적인
// key로 렌더해, 스트리밍으로 새 조각이 붙을 때 그 조각만 마운트되며 페이드인된다.
function toBlocks(content: string): string[] {
  const blocks: string[] = [];
  content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((para) => {
      const structured = /^(#{1,6}\s|[-*+]\s|\d+\.\s|>|```)/.test(para);
      if (structured) {
        blocks.push(para);
        return;
      }
      para
        .split(/(?<=[.!?。])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => blocks.push(s));
    });
  return blocks;
}

function AnimatedMarkdown({ content }: { content: string }) {
  const blocks = toBlocks(content);
  return (
    <>
      {blocks.map((block, i) => (
        <motion.div
          key={i}
          className="mb-1 last:mb-0"
          initial={blockInitial}
          animate={blockAnimate}
          transition={blockTransition}
        >
          <Markdown className="chat-markdown">{block}</Markdown>
        </motion.div>
      ))}
    </>
  );
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

function Sources({ sources }: { sources: ChatSource[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mt-2 border-t border-border/60 pt-2"
    >
      <span className="text-[11px] font-medium text-muted-foreground">
        참고한 글
      </span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <a
            key={s.slug}
            href={`/blog/${s.slug}`}
            className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground hover:ring-foreground/30"
          >
            {s.title}
          </a>
        ))}
      </div>
    </motion.div>
  );
}

export function ChatMessages({
  messages,
  loading,
  onAsk,
}: {
  messages: Message[];
  loading: boolean;
  onAsk: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastIndex = messages.length - 1;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-center text-sm text-muted-foreground">
            블로그에 대해 무엇이든 물어보세요!
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <motion.button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>
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
              msg.role === "assistant" && !msg.content && "w-fit",
            )}
          >
            {msg.role === "assistant" ? (
              <>
                {msg.content ? (
                  i === lastIndex ? (
                    <AnimatedMarkdown content={msg.content} />
                  ) : (
                    <Markdown className="chat-markdown">{msg.content}</Markdown>
                  )
                ) : (
                  // 응답이 아직 시작되지 않았을 때만 대기 표시
                  <TypingDots />
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <Sources sources={msg.sources} />
                )}
              </>
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
