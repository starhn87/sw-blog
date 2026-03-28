interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

interface RagChunk {
  slug: string;
  title: string;
  chunkIndex: number;
  content: string;
}

interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}

const SYSTEM_PROMPT = `당신은 이승우의 블로그 도우미 챗봇이에요.
블로그에 있는 글을 기반으로 방문자의 질문에 친절하게 답변해주세요.
답변은 해요체로 자연스럽게 해주세요.
블로그 내용과 관련 없는 질문에는 정중하게 블로그 관련 질문을 해달라고 안내해주세요.
답변은 간결하게 해주세요.`;

const API_URL = "https://api.anthropic.com/v1/messages";

let cachedChunks: RagChunk[] | null = null;

function findRelevantChunks(
  chunks: RagChunk[],
  query: string,
  limit = 5,
): RagChunk[] {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const scored = chunks.map((chunk) => {
    const text = `${chunk.title} ${chunk.content}`.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      const regex = new RegExp(word, "g");
      const matches = text.match(regex);
      return acc + (matches?.length ?? 0);
    }, 0);
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allowed =
    origin === allowedOrigin ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:3001";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405, headers: cors },
      );
    }

    const { messages } = (await request.json()) as ChatRequest;

    if (!messages || messages.length === 0) {
      return Response.json(
        { error: "messages required" },
        { status: 400, headers: cors },
      );
    }

    const lastUserMessage = messages.findLast((m) => m.role === "user");
    if (!lastUserMessage) {
      return Response.json(
        { error: "no user message" },
        { status: 400, headers: cors },
      );
    }

    // Fetch and cache RAG chunks
    if (!cachedChunks) {
      try {
        const res = await fetch(`${env.ALLOWED_ORIGIN}/rag-chunks.json`);
        cachedChunks = (await res.json()) as RagChunk[];
      } catch {
        cachedChunks = [];
      }
    }

    const relevant = findRelevantChunks(cachedChunks, lastUserMessage.content);
    const contextBlock =
      relevant.length > 0
        ? `\n\n아래는 블로그에서 찾은 관련 내용이에요:\n\n${relevant
            .map((c) => `[${c.title}]\n${c.content}`)
            .join("\n\n---\n\n")}`
        : "";

    const apiKey = env.ANTHROPIC_API_KEY.trim();

    try {
      const body = JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT + contextBlock,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
        // 매 요청마다 새 Request 객체를 생성하여 커넥션 재사용 방지
        const req = new Request(API_URL, {
          method: "POST",
          headers: new Headers({
            "content-type": "application/json",
            "x-api-key": apiKey,
            "authorization": `Bearer ${apiKey}`,
            "anthropic-version": "2023-06-01",
          }),
          body,
        });
        res = await fetch(req, { cf: { cacheTtl: 0 } } as RequestInit);
        if (res.ok || res.status !== 401) break;
        // 401이면 재시도
      }

      if (!res || !res.ok) {
        const errorBody = await res?.text();
        console.error("Anthropic API error:", res?.status, errorBody);
        return Response.json(
          {
            error: `API error: ${res?.status}`,
            detail: errorBody,
            keyPrefix: apiKey.slice(0, 10) + "...",
            keyLength: apiKey.length,
          },
          { status: 502, headers: cors },
        );
      }

      const data = (await res.json()) as {
        content: { type: string; text: string }[];
      };
      const text =
        data.content[0]?.type === "text" ? data.content[0].text : "";

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(text)}\n\n`),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Chat proxy error:", message);
      return Response.json(
        { error: message },
        { status: 500, headers: cors },
      );
    }
  },
};
