import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  content: string;
}

function keywordSearch(q: string, posts: SearchItem[]) {
  const lower = q.toLowerCase();
  const scored: { slug: string; score: number }[] = [];
  for (const p of posts) {
    let score = 0;
    if (p.title.toLowerCase().includes(lower)) score += 1.0;
    if (p.tags.some((t) => t.toLowerCase().includes(lower))) score += 0.7;
    if (p.description.toLowerCase().includes(lower)) score += 0.4;
    if (p.content.toLowerCase().includes(lower)) score += 0.2;
    if (score > 0) scored.push({ slug: p.slug, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return Response.json({ results: [] });
  }

  const indexRes = await fetch(new URL("/search-index.json", request.url));
  const posts = (await indexRes.json()) as SearchItem[];
  const keywordResults = keywordSearch(q, posts);

  try {
    const { env } = getRequestContext();

    const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
      text: [q],
    })) as { data: number[][] };

    const matches = await env.VECTORIZE.query(embeddings[0], {
      topK: 10,
      returnMetadata: "all",
    });

    const semanticResults = matches.matches
      .filter((m) => m.score >= 0.4)
      .map((m) => ({ slug: m.id, score: m.score }));

    const seen = new Set(keywordResults.map((r) => r.slug));
    const merged = [
      ...keywordResults,
      ...semanticResults.filter((r) => !seen.has(r.slug)),
    ];

    return Response.json({ results: merged });
  } catch {
    return Response.json({ results: keywordResults });
  }
}
