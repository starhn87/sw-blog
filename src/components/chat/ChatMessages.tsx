"use client";

import { useEffect, useRef, Fragment, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
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

const wordTransition = { duration: 0.4, ease: "easeOut" as const };

// react-markdown이 렌더한 텍스트를 단어(공백 포함) 단위로 감싸 각각 페이드인한다.
// 문단·리스트 같은 블록 구조는 그대로라 레이아웃이 고정되고, 새로 붙는 단어만 페이드된다.
// key를 위치(index) 기반으로 줘서 이미 나타난 단어는 다시 페이드되지 않는다.
function fadeWords(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return children.split(/(\s+)/).map((part, i) =>
      part.trim() === "" ? (
        part
      ) : (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={wordTransition}
        >
          {part}
        </motion.span>
      ),
    );
  }
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === "string" ? (
        <Fragment key={i}>{fadeWords(child)}</Fragment>
      ) : (
        child
      ),
    );
  }
  return children;
}

// 텍스트를 담는 블록만 단어 페이드를 적용한다. strong·code 등 인라인 요소는 그대로 둔다.
const fadeComponents: Components = {
  p: ({ children }: { children?: ReactNode }) => <p>{fadeWords(children)}</p>,
  li: ({ children }: { children?: ReactNode }) => <li>{fadeWords(children)}</li>,
};

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
                  i === lastIndex && loading ? (
                    // 스트리밍 중에도 완성과 같은 마크다운으로 렌더해 레이아웃을 고정하고,
                    // 텍스트만 단어 단위로 페이드인해 새 단어가 부드럽게 나타나게 한다.
                    <Markdown className="chat-markdown" components={fadeComponents}>
                      {msg.content}
                    </Markdown>
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
