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

        // 청크(토큰)가 덩어리로 오면 여러 단어가 한꺼번에 붙어 끊겨 보인다. 표시 진도를
        // rAF로 글자 단위까지 매끄럽게 따라가게 하고, 등장은 ChatMessages의 단어 페이드
        // (fadeComponents)로 처리해 연속적인 페이드 흐름으로 이어지게 한다.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let displayed = 0;
        let streamDone = false;

        const flushing = new Promise<void>((resolve) => {
          const pump = () => {
            if (displayed < buffer.length) {
              const remaining = buffer.length - displayed;
              displayed += Math.max(1, Math.ceil(remaining / 40));
              setMessages([
                ...newMessages,
                { role: "assistant", content: buffer.slice(0, displayed), sources },
              ]);
            }
            if (!streamDone || displayed < buffer.length) {
              requestAnimationFrame(pump);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(pump);
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
        }
        streamDone = true;
        await flushing;
        // 마지막 단어의 페이드가 끝난 뒤 전환되도록 잠깐 기다린다. loading이 false가 되면
        // ChatMessages가 단어 페이드 없는 기본 마크다운으로 렌더하기 때문이다.
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (!buffer) {
          setMessages([
            ...newMessages,
            { role: "assistant", content: "응답을 받지 못했어요.", sources },
          ]);
        }
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
