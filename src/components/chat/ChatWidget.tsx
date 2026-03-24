"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageCircle, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function ChatWidget() {
  const [open, setOpenState] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const isMobile = useIsMobile();

  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (isMobile) {
      document.body.style.overflow = value ? "hidden" : "";
    }
  };

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "죄송해요, 오류가 발생했어요." },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const text = JSON.parse(data) as string;
            assistantContent += text;
            setMessages([
              ...newMessages,
              { role: "assistant", content: assistantContent },
            ]);
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "네트워크 오류가 발생했어요." },
      ]);
    }

    setStreaming(false);
  }, [input, messages, streaming]);

  const chatContent = (
    <>
      <ChatMessages messages={messages} streaming={streaming} />
      <div className="pb-safe">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={streaming}
        />
      </div>
    </>
  );

  return (
    <>
      {/* 플로팅 버튼 */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground p-3 text-background shadow-lg transition-transform hover:scale-105"
            aria-label="Chat"
          >
            <MessageCircle size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && isMobile && (
          <>
            {/* 모바일: 바텀시트 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] max-h-[700px] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl"
            >
              <div className="flex flex-col items-center pt-2">
                <div className="mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                <div className="flex w-full items-center justify-between border-b border-border px-4 pb-3">
                  <span className="text-sm font-semibold">AI 챗봇</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      블로그 콘텐츠 기반
                    </span>
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Close chat"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {chatContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && !isMobile && (
          <>
            {/* 데스크탑: 플로팅 패널 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col rounded-2xl border border-border bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">AI 챗봇</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    블로그 콘텐츠 기반
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Close chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {chatContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
