import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

function localSearch(q: string, posts: SearchItem[]) {
  const lower = q.toLowerCase();
  return posts
    .filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.toLowerCase().includes(lower)),
    )
    .map((p) => ({ slug: p.slug, score: 1 }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return Response.json({ results: [] });
  }

  try {
    const { env } = getRequestContext();

    const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
      text: [q],
    })) as { data: number[][] };

    const matches = await env.VECTORIZE.query(embeddings[0], {
      topK: 5,
      returnMetadata: "all",
    });

    const results = matches.matches
      .filter((m) => m.score > 0.3)
      .map((m) => ({
        slug: m.id,
        score: m.score,
      }));

    return Response.json({ results });
  } catch {
    const res = await fetch(new URL("/search-index.json", request.url));
    const posts = (await res.json()) as SearchItem[];
    return Response.json({ results: localSearch(q, posts) });
  }
}
