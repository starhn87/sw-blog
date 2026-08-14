import { getRequestContext } from "@cloudflare/next-on-pages";
import { isAdmin } from "@/lib/auth";
import type { RagChunk } from "@/lib/rag";

export const runtime = "edge";

const VECTOR_IDS_KEY = ".rag-vector-ids.json";

export async function POST(request: Request) {
  const { env } = getRequestContext();

  if (!isAdmin(request, env)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const chunksUrl = new URL("/rag-chunks.json", request.url);
  chunksUrl.searchParams.set("_", Date.now().toString());
  const res = await fetch(chunksUrl.toString());
  const chunks = (await res.json()) as RagChunk[];

  const batchSize = 20;
  let totalUpserted = 0;
  const currentIds = chunks.map((chunk) => `${chunk.slug}-${chunk.chunkIndex}`);
  const previousManifest = await env.MEDIA.get(VECTOR_IDS_KEY);
  const previousIds = previousManifest
    ? ((await previousManifest.json()) as string[])
    : [];
  const currentIdSet = new Set(currentIds);
  const staleIds = previousIds.filter((id) => !currentIdSet.has(id));
  if (staleIds.length > 0) {
    await env.RAG_VECTORIZE.deleteByIds(staleIds);
  }

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const texts = batch.map(
      (c) => `${c.title} ${c.content}`,
    );

    const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
      text: texts,
    })) as { data: number[][] };

    const vectors = batch.map((chunk, j) => ({
      id: `${chunk.slug}-${chunk.chunkIndex}`,
      values: embeddings[j],
      metadata: {
        slug: chunk.slug,
        title: chunk.title,
        chunkIndex: chunk.chunkIndex,
      },
    }));

    await env.RAG_VECTORIZE.upsert(vectors);
    totalUpserted += vectors.length;
  }

  await env.MEDIA.put(VECTOR_IDS_KEY, JSON.stringify(currentIds), {
    httpMetadata: { contentType: "application/json" },
  });

  return Response.json({ indexed: totalUpserted, deleted: staleIds.length });
}
