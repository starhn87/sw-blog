import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  buildRagContext,
  findRelevantChunks,
  getRagSources,
  type RagChunk,
} from "@/lib/rag";
import { logError } from "@/lib/log";
import { careers, highlights, sideProjects, skillCategories } from "@/data/about";

const SYSTEM_PROMPT = `당신은 Seungwoo Lee 블로그의 도우미 챗봇이에요.
블로그의 글과 작성자(이승우) 소개를 기반으로 방문자의 질문에 친절하게 답변해주세요.
작성자의 경력·기술·사이드 프로젝트에 대한 질문도 환영해요.
답변은 해요체로 자연스럽게 해주세요.
답변은 간결하게 해주세요.`;

const ABOUT_CONTEXT = [
  "아래는 블로그 작성자 이승우(Seungwoo Lee) 소개예요.",
  "",
  "[경력]",
  ...careers.map((c) => `- ${c.company} ${c.role} (${c.period}): ${c.description}`),
  "",
  "[주요 성과]",
  ...highlights.map(
    (h) => `- ${h.label}: ${h.prefix ?? ""}${h.to}${h.suffix} (${h.detail})`,
  ),
  "",
  "[사이드 프로젝트]",
  ...sideProjects.map((p) => `- ${p.name} (${p.tagline}): ${p.description}`),
  "",
  "[기술 스택]",
  ...skillCategories.map(
    (c) => `- ${c.label}: ${c.skills.map((s) => s.name).join(", ")}`,
  ),
].join("\n");

const BLOG_ORIGIN = "https://www.seung-woo.me";

let cachedCodebaseSummary: string | null = null;

export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages || messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "no user message" }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  if (!cachedCodebaseSummary) {
    try {
      const r = await fetch(`${BLOG_ORIGIN}/codebase-summary.txt`);
      cachedCodebaseSummary = await r.text();
    } catch {
      cachedCodebaseSummary = "";
    }
  }

  let relevant: RagChunk[] = [];
  try {
    relevant = await findRelevantChunks(lastUserMessage.content, env);
  } catch {
    // Vectorize unavailable (local dev) - skip RAG context
  }

  const contextBlock = buildRagContext(relevant);
  const sources = getRagSources(relevant);

  const client = new Anthropic({ apiKey });

  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT },
    {
      type: "text",
      text: `\n\n${ABOUT_CONTEXT}`,
      cache_control: { type: "ephemeral" },
    } as Anthropic.Messages.TextBlockParam,
  ];
  if (cachedCodebaseSummary) {
    system.push({
      type: "text",
      text: `\n\n아래는 블로그의 실제 코드베이스 현황이에요. 게시글 내용과 실제 구현 상태가 다를 수 있으니, 코드베이스 현황을 우선으로 참고하세요:\n\n${cachedCodebaseSummary}`,
      cache_control: { type: "ephemeral" },
    } as Anthropic.Messages.TextBlockParam);
  }
  if (contextBlock) {
    system.push({
      type: "text",
      text: contextBlock,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const events = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        });
        for await (const event of events) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        logError("api/chat", err);
        controller.enqueue(
          encoder.encode("죄송해요, 답변 생성 중 오류가 발생했어요."),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Chat-Sources": encodeURIComponent(JSON.stringify(sources)),
    },
  });
}
