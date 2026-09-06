import { describe, expect, it } from "vitest";
import {
  buildRagContext,
  getRagSources,
  matchRagChunks,
  type RagChunk,
} from "./rag";

const chunks: RagChunk[] = [
  {
    slug: "postgis-location-search",
    title: "PostGIS로 위치 검색하기",
    chunkIndex: 0,
    content: "PostGIS는 PostgreSQL에 공간 정보를 더해줘요.",
  },
  {
    slug: "postgis-location-search",
    title: "PostGIS로 위치 검색하기",
    chunkIndex: 1,
    content: "geometry와 geography는 거리 계산 방식이 달라요.",
  },
  {
    slug: "hello-world",
    title: "Hello World",
    chunkIndex: 0,
    content: "블로그를 소개해요.",
  },
];

describe("RAG context", () => {
  it("maps only relevant vector matches to stored chunks", () => {
    const relevant = matchRagChunks(
      [
        {
          score: 0.91,
          metadata: {
            slug: "postgis-location-search",
            title: "PostGIS로 위치 검색하기",
            chunkIndex: 1,
          },
        },
        {
          score: 0.3,
          metadata: {
            slug: "hello-world",
            title: "Hello World",
            chunkIndex: 0,
          },
        },
        {
          score: 0.8,
          metadata: {
            slug: "missing-post",
            title: "없는 글",
            chunkIndex: 0,
          },
        },
      ],
      chunks,
    );

    expect(relevant).toEqual([chunks[1]]);
  });

  it("ignores malformed vector metadata", () => {
    expect(
      matchRagChunks(
        [
          { score: 0.9 },
          {
            score: 0.9,
            metadata: {
              slug: "hello-world",
              title: "Hello World",
              chunkIndex: "0",
            },
          },
        ],
        chunks,
      ),
    ).toEqual([]);
  });

  it("deduplicates sources in relevance order", () => {
    expect(getRagSources([chunks[1], chunks[0], chunks[2]])).toEqual([
      {
        slug: "postgis-location-search",
        title: "PostGIS로 위치 검색하기",
      },
      { slug: "hello-world", title: "Hello World" },
    ]);
  });

  it("formats related chunks for the system prompt", () => {
    expect(buildRagContext([chunks[0], chunks[2]])).toBe(
      "\n\n아래는 블로그에서 찾은 관련 내용이에요:\n\n" +
        "[PostGIS로 위치 검색하기]\nPostGIS는 PostgreSQL에 공간 정보를 더해줘요.\n\n" +
        "---\n\n[Hello World]\n블로그를 소개해요.",
    );
    expect(buildRagContext([])).toBe("");
  });
});
