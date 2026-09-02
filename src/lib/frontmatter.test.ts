import matter from "gray-matter";
import { describe, expect, it } from "vitest";

describe("frontmatter engines", () => {
  it("preserves YAML metadata and MDX content", () => {
    const { data, content } = matter('---\ntitle: "테스트"\npublished: true\ntags: [Next.js, R2]\n---\n<Callout>본문</Callout>');
    expect(data).toEqual({ title: "테스트", published: true, tags: ["Next.js", "R2"] });
    expect(content).toBe("<Callout>본문</Callout>");
  });

  it("preserves JSON frontmatter", () => {
    expect(matter('---json\n{"title":"test"}\n---\nbody').data).toEqual({ title: "test" });
  });

  it.each(["js", "javascript"])("rejects executable %s frontmatter", (language) => {
    expect(() => matter(`---${language}\n({ title: "test" })\n---\nbody`)).toThrow(`engine "${language}" is not registered`);
  });
});
