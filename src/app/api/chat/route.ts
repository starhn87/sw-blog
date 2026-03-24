import Anthropic from "@anthropic-ai/sdk";
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

  // RAG: fetch chunks and find relevant ones
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
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + contextBlock,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event.delta.text)}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
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
