import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createHighlighter } from "shiki";
import { getSingletonHighlighter } from "./shiki";

const posts = readdirSync("content/posts").filter((file) => file.endsWith(".mdx"));

describe("blog syntax highlighting", () => {
  it.each(posts)("preserves code colors in %s", async (file) => {
    const source = readFileSync(`content/posts/${file}`, "utf8");
    const blocks = [...source.matchAll(/^(`{3,}|~{3,})([^\s`~]+)[^\n]*\n([\s\S]*?)^\1\s*$/gm)];
    const langs = [...new Set(blocks.map((block) => block[2]))];
    const options = { langs, themes: ["github-dark", "github-light"] };
    const highlighter = await getSingletonHighlighter(options);
    const original = await createHighlighter(options);
    try {
      for (const [, , lang, code] of blocks) {
        const colors = {
          lang: lang as Parameters<typeof highlighter.codeToTokens>[1]["lang"],
          themes: { dark: "github-dark", light: "github-light" },
        } as const;
        expect(highlighter.codeToTokens(code, colors)).toEqual(original.codeToTokens(code, colors));
      }
    } finally {
      original.dispose();
    }
  });
});
