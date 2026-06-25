import { useState, useCallback } from "react";

export interface ChatSource {
  slug: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
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

      // 토큰은 스트리밍으로 받되, 문단(\n\n)이 완성될 때마다 그 단위로 표시한다.
      // 글자 단위 타이핑 없이 문단이 통째로 페이드인되도록 한다.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let shown = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lastBreak = buffer.lastIndexOf("\n\n");
        if (lastBreak >= 0) {
          const completed = buffer.slice(0, lastBreak);
          if (completed.length > shown.length) {
            shown = completed;
            setMessages([
              ...newMessages,
              { role: "assistant", content: shown, sources },
            ]);
          }
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
  }, [input, messages, loading]);

  return { messages, input, setInput, loading, handleSubmit };
}
