import { useState, useCallback, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const animatedCountRef = useRef(0);

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

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("Chat API error:", res.status, errBody);
        setMessages([
          ...newMessages,
          { role: "assistant", content: "죄송해요, 오류가 발생했어요." },
        ]);
        setLoading(false);
        return;
      }

      const { text: assistantText } = (await res.json()) as { text: string };
      setMessages([
        ...newMessages,
        { role: "assistant", content: assistantText || "응답을 받지 못했어요." },
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

  return { messages, input, setInput, loading, handleSubmit, animatedCountRef };
}
