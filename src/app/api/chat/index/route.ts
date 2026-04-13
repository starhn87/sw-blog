import { getRequestContext } from "@cloudflare/next-on-pages";
import type { RagChunk } from "@/lib/rag";

export const runtime = "edge";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password: string };
  const { env } = getRequestContext();

  if (password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = await fetch(new URL("/rag-chunks.json", request.url));
  const chunks = (await res.json()) as RagChunk[];

  const batchSize = 20;
  let totalUpserted = 0;

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

  return Response.json({ indexed: totalUpserted });
}
