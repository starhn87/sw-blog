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
import { TypeSafeClient, APIUserAbortError } from "@typesafe-ai/sdk";
import { toObservation } from "@starhn87/jev-decisions";
import { recordChatObservation } from "@/lib/chatShadowObservation";
import { CHAT_CONTEXT_QUESTIONS, contextPlan } from "@/lib/chatContextDecision";

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

  const { env, ctx } = getCloudflareContext();
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  let plan = { about: true, code: true, posts: true };
  const mode = String(Reflect.get(env, "JEV_CHAT_MODE") ?? "off");
  const jevKey: unknown = Reflect.get(env, "TYPESAFE_API_KEY");
  const recent = messages.slice(-6);
  if (typeof jevKey === "string" && jevKey && (mode === "shadow" || mode === "enforce") &&
    recent.every(m => typeof m.content === "string") && recent.reduce((sum, m) => sum + m.content.length, 0) <= 6000) {
    const client = new TypeSafeClient({ apiKey: jevKey, baseURL: "https://api.typesafe.ai",
      defaultModel: "jev-1.13.0", retry: { maxRetries: 0 }, logLevel: "off" });
    const started = performance.now();
    let outcome;
    try {
      if (request.signal.aborted) throw new APIUserAbortError();
      outcome = await client.systemOne({ state: { messages: recent }, questions: CHAT_CONTEXT_QUESTIONS },
        { signal: request.signal, timeout: 1000 }).withResponse();
    } catch (error) { outcome = { error }; }
    const result = toObservation(CHAT_CONTEXT_QUESTIONS, outcome, {
      definitionId: "blog-context", definitionVersion: "1", requestedModel: client.defaultModel,
      durationMs: performance.now() - started,
    });
    result.meta.durationMs = performance.now() - started;
    if (ctx && env.DB) ctx.waitUntil(recordChatObservation(env.DB, mode, result).catch(() => {
      console.warn("jev.blog-observation-write-failed");
    }));
    if (!result.ok && result.error.kind === "aborted") return new Response(null, { status: 499 });
    const configuredThreshold: unknown = Reflect.get(env, "JEV_CONTEXT_EXCLUSION_THRESHOLD");
    const threshold = typeof configuredThreshold === "string" && configuredThreshold ? Number(configuredThreshold) : undefined;
    const proposed = contextPlan(result, threshold);
    console.info("jev.blog-context", { mode, meta: result.meta, ok: result.ok,
      ...(result.ok ? { answers: result.answers, proposed } : { error: result.error.kind }) });
    if (mode === "enforce") plan = proposed;
  }
  if (request.signal.aborted) return new Response(null, { status: 499 });

  if (plan.code && !cachedCodebaseSummary) {
    try {
      const r = await fetch(`${BLOG_ORIGIN}/codebase-summary.txt`);
      cachedCodebaseSummary = await r.text();
    } catch {
      cachedCodebaseSummary = "";
    }
  }

  let relevant: RagChunk[] = [];
  try {
    if (plan.posts) relevant = await findRelevantChunks(lastUserMessage.content, env);
  } catch {
    // Vectorize unavailable (local dev) - skip RAG context
  }

  const contextBlock = buildRagContext(relevant);
  const sources = getRagSources(relevant);

  const client = new Anthropic({ apiKey });

  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT },
  ];
  if (plan.about) system.push({
      type: "text",
      text: `\n\n${ABOUT_CONTEXT}`,
      cache_control: { type: "ephemeral" },
    });
  if (plan.code && cachedCodebaseSummary) {
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
