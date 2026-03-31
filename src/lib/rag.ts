export interface RagChunk {
  slug: string;
  title: string;
  chunkIndex: number;
  content: string;
}

export function findRelevantChunks(
  chunks: RagChunk[],
  query: string,
  limit = 5,
): RagChunk[] {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const scored = chunks.map((chunk) => {
    const text = `${chunk.title} ${chunk.content}`.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      const regex = new RegExp(word, "g");
      const matches = text.match(regex);
      return acc + (matches?.length ?? 0);
    }, 0);
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}
