import { findRelevantChunks } from "@/lib/rag";

export const runtime = "edge";

const SYSTEM_PROMPT = `당신은 이승우의 블로그 도우미 챗봇이에요.
블로그에 있는 글을 기반으로 방문자의 질문에 친절하게 답변해주세요.
답변은 해요체로 자연스럽게 해주세요.
블로그 내용과 관련 없는 질문에는 정중하게 블로그 관련 질문을 해달라고 안내해주세요.
답변은 간결하게 해주세요.`;

export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const lastUserMessage = messages.findLast((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "no user message" }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;
  const chunksRes = await fetch(`${baseUrl}/rag-chunks.json`);
  const chunks = (await chunksRes.json()) as {
    slug: string;
    title: string;
    chunkIndex: number;
    content: string;
  }[];
  const relevant = findRelevantChunks(chunks, lastUserMessage.content);

  const contextBlock =
    relevant.length > 0
      ? `\n\n아래는 블로그에서 찾은 관련 내용이에요:\n\n${relevant
          .map((c) => `[${c.title}]\n${c.content}`)
          .join("\n\n---\n\n")}`
      : "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        stream: true,
        system: SYSTEM_PROMPT + contextBlock,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return Response.json({ error: "API error" }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = res.body.getReader();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";

            for (const line of parts) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (
                  parsed.type === "content_block_delta" &&
                  parsed.delta?.text
                ) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify(parsed.delta.text)}\n\n`,
                    ),
                  );
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
