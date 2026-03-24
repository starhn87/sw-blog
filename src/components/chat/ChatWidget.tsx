"use client";

import { useState, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

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

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground p-3 text-background shadow-lg transition-transform hover:scale-105"
        aria-label="Chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 flex h-[480px] w-[360px] flex-col rounded-xl border border-border bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">AI 챗봇</span>
              <span className="text-xs text-muted-foreground">
                블로그 콘텐츠 기반
              </span>
            </div>
            <ChatMessages messages={messages} streaming={streaming} />
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={streaming}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
