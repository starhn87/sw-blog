export interface RagChunk {
  slug: string;
  title: string;
  chunkIndex: number;
  content: string;
}

interface RagSource {
  slug: string;
  title: string;
}

type RagVectorMatch = {
  score: number;
  metadata?: unknown;
};

const BLOG_ORIGIN = "https://www.seung-woo.me";
const MINIMUM_MATCH_SCORE = 0.3;

let cachedChunks: RagChunk[] | null = null;

function isRagChunkMetadata(
  metadata: unknown,
): metadata is Pick<RagChunk, "slug" | "chunkIndex"> {
  if (!metadata || typeof metadata !== "object") return false;

  const candidate = metadata as Record<string, unknown>;
  return (
    typeof candidate.slug === "string" &&
    typeof candidate.chunkIndex === "number"
  );
}

export function matchRagChunks(
  matches: readonly RagVectorMatch[],
  chunks: readonly RagChunk[],
): RagChunk[] {
  return matches.flatMap((match) => {
    if (
      match.score <= MINIMUM_MATCH_SCORE ||
      !isRagChunkMetadata(match.metadata)
    ) {
      return [];
    }

    const metadata = match.metadata;
    const chunk = chunks.find(
      (candidate) =>
        candidate.slug === metadata.slug &&
        candidate.chunkIndex === metadata.chunkIndex,
    );

    return chunk?.content ? [chunk] : [];
  });
}

export function getRagSources(chunks: readonly RagChunk[]): RagSource[] {
  const sources: RagSource[] = [];
  const seenSlugs = new Set<string>();

  for (const chunk of chunks) {
    if (seenSlugs.has(chunk.slug)) continue;

    seenSlugs.add(chunk.slug);
    sources.push({ slug: chunk.slug, title: chunk.title });
  }

  return sources;
}

export function buildRagContext(chunks: readonly RagChunk[]): string {
  if (chunks.length === 0) return "";

  return `\n\n아래는 블로그에서 찾은 관련 내용이에요:\n\n${chunks
    .map((chunk) => `[${chunk.title}]\n${chunk.content}`)
    .join("\n\n---\n\n")}`;
}

export async function findRelevantChunks(
  query: string,
  env: Pick<CloudflareEnv, "AI" | "RAG_VECTORIZE">,
  limit = 5,
): Promise<RagChunk[]> {
  const { data: embeddings } = (await env.AI.run("@cf/baai/bge-m3", {
    text: [query],
  })) as { data: number[][] };

  const matches = await env.RAG_VECTORIZE.query(embeddings[0], {
    topK: limit,
    returnMetadata: "all",
  });

  if (!cachedChunks) {
    const response = await fetch(`${BLOG_ORIGIN}/rag-chunks.json`);
    cachedChunks = (await response.json()) as RagChunk[];
  }

  return matchRagChunks(matches.matches, cachedChunks);
}
