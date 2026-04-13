import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  content: string;
}

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password: string };
  const { env } = getRequestContext();

  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(new URL("/search-index.json", request.url));
  const posts = (await res.json()) as SearchItem[];

  const texts = posts.map(
    (p) => `${p.title} ${p.description} ${p.tags.join(" ")}`,
  );

  const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
    text: texts,
  })) as { data: number[][] };

  const vectors = posts.map((post, i) => ({
    id: post.slug,
    values: embeddings[i],
    metadata: {
      title: post.title,
      description: post.description,
      tags: post.tags.join(","),
      date: post.date,
    },
  }));

  await env.VECTORIZE.upsert(vectors);

  return Response.json({ indexed: posts.length });
}
