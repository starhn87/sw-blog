import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return Response.json({ results: [] });
  }

  const { env } = getRequestContext();

  const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
    text: [q],
  })) as { data: number[][] };

  const matches = await env.VECTORIZE.query(embeddings[0], {
    topK: 5,
    returnMetadata: "all",
  });

  const results = matches.matches.map((m) => ({
    slug: m.id,
    score: m.score,
    ...(m.metadata as Record<string, string>),
  }));

  return Response.json({ results, count: matches.count });
}
