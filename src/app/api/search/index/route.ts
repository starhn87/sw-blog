import { getRequestContext } from "@cloudflare/next-on-pages";
import { isAdmin } from "@/lib/auth";

export const runtime = "edge";

const VECTOR_IDS_KEY = ".search-vector-ids.json";

interface SearchItem {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  content: string;
}

export async function POST(request: Request) {
  const { env } = getRequestContext();

  if (!isAdmin(request, env)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const indexUrl = new URL("/search-index.json", request.url);
  indexUrl.searchParams.set("_", Date.now().toString());
  const res = await fetch(indexUrl.toString());
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

  const currentIds = vectors.map((vector) => vector.id);
  const previousManifest = await env.MEDIA.get(VECTOR_IDS_KEY);
  const previousIds = previousManifest
    ? ((await previousManifest.json()) as string[])
    : [];
  const currentIdSet = new Set(currentIds);
  const staleIds = previousIds.filter((id) => !currentIdSet.has(id));
  if (staleIds.length > 0) {
    await env.VECTORIZE.deleteByIds(staleIds);
  }

  if (vectors.length > 0) {
    await env.VECTORIZE.upsert(vectors);
  }
  await env.MEDIA.put(VECTOR_IDS_KEY, JSON.stringify(currentIds), {
    httpMetadata: { contentType: "application/json" },
  });

  return Response.json({ indexed: posts.length, deleted: staleIds.length });
}
