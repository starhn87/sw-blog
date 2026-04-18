"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useChat } from "@/hooks/useChat";

export default function ChatWidget() {
  const [open, setOpenState] = useState(false);
  const isMobile = useIsMobile();
  const { messages, input, setInput, loading, handleSubmit, animatedCountRef } = useChat();

  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (isMobile) {
      document.body.style.overflow = value ? "hidden" : "";
    }
  };

  const chatContent = (
    <>
      <ChatMessages messages={messages} loading={loading} animatedCountRef={animatedCountRef} />
      <div className="pb-safe">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={loading}
          autoFocus={open}
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
            type="button"
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
              role="dialog"
              aria-modal="true"
              aria-label="AI 챗봇"
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
              role="dialog"
              aria-modal="true"
              aria-label="AI 챗봇"
              className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] flex-col rounded-2xl border border-border bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">AI 챗봇</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    블로그 콘텐츠 기반
                  </span>
                  <button
                    type="button"
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
