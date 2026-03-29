"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Message {
  role: "user" | "assistant";
  content: string;
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

    await new Promise((r) => setTimeout(r, 500));
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("https://sw-blog-chat-proxy.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        console.error("Chat proxy error:", res.status, errBody);
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

      const showAfter = Date.now() + 1000;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const text = JSON.parse(data) as string;
              assistantContent += text;
              if (Date.now() >= showAfter) {
                setMessages([
                  ...newMessages,
                  { role: "assistant", content: assistantContent },
                ]);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } finally {
        // 최소 로딩 시간 대기
        const remaining = showAfter - Date.now();
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        // 최종 콘텐츠 반영
        if (assistantContent) {
          setMessages([
            ...newMessages,
            { role: "assistant", content: assistantContent },
          ]);
        }
        setStreaming(false);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "네트워크 오류가 발생했어요." },
      ]);
      setStreaming(false);
    }
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
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 300) {
                  setOpen(false);
                }
              }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl"
            >
              <div className="flex flex-col items-center pt-2 touch-none">
                <div className="mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
                <div className="flex w-full items-center justify-between border-b border-border px-4 pb-3">
                  <span className="text-sm font-semibold">AI 챗봇</span>
                  <span className="text-xs text-muted-foreground">
                    블로그 콘텐츠 기반
                  </span>
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
              className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col rounded-2xl border border-border bg-background shadow-2xl"
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
