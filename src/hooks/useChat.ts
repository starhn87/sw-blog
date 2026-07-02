import { useState, useCallback, useEffect } from "react";

export interface ChatSource {
  slug: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

const STORAGE_KEY = "chat-history";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 마운트 시 이전 대화 복원
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  // 대화 저장
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // 저장 실패는 무시
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMessage: Message = { role: "user", content: trimmed };
      const newMessages = [...messages, userMessage];
      setMessages([...newMessages, { role: "assistant", content: "" }]);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
        });

        if (!res.ok || !res.body) {
          const errBody = await res.text().catch(() => "");
          console.error("Chat API error:", res.status, errBody);
          setMessages([
            ...newMessages,
            { role: "assistant", content: "죄송해요, 오류가 발생했어요." },
          ]);
          return;
        }

        let sources: ChatSource[] = [];
        const sourcesHeader = res.headers.get("X-Chat-Sources");
        if (sourcesHeader) {
          try {
            sources = JSON.parse(decodeURIComponent(sourcesHeader)) as ChatSource[];
          } catch {
            // 헤더 파싱 실패 시 출처 없이 진행
          }
        }

        // 토큰을 스트리밍으로 받되, 문장(.!?。)이나 줄바꿈이 완성될 때마다
        // 그 지점까지만 표시한다. 미완성 꼬리는 버퍼에 남겨 다음 경계에서 함께 보인다.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let shown = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const match = buffer.match(/^[\s\S]*[.!?。\n]/);
          const completed = match ? match[0] : "";
          if (completed.length > shown.length) {
            shown = completed;
            setMessages([
              ...newMessages,
              { role: "assistant", content: shown, sources },
            ]);
          }
        }

        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: buffer || "응답을 받지 못했어요.",
            sources,
          },
        ]);
      } catch {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "네트워크 오류가 발생했어요." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading],
  );

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  }, [input, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 무시
    }
  }, []);

  return {
    messages,
    input,
    setInput,
    loading,
    handleSubmit,
    sendMessage,
    clearMessages,
  };
}
