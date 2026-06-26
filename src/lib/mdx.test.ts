import { describe, it, expect } from "vitest";
import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/mdx";

describe("mdx content queries", () => {
  it("returns only published posts in date-descending order", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.published)).toBe(true);
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].date).getTime()).toBeGreaterThanOrEqual(
        new Date(posts[i].date).getTime(),
      );
    }
  });

  it("getPostsByTag returns only posts carrying that tag", () => {
    const tag = getAllTags()[0];
    const tagged = getPostsByTag(tag);
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every((p) => p.tags.includes(tag))).toBe(true);
  });

  it("getPostsByTag returns an empty array for an unknown tag", () => {
    expect(getPostsByTag("__no_such_tag__")).toEqual([]);
  });

  it("getAllTags returns a sorted, unique tag list", () => {
    const tags = getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect([...new Set(tags)]).toEqual(tags);
    expect([...tags].sort()).toEqual(tags);
  });
});
