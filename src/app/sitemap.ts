import type { MetadataRoute } from "next";
import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/mdx";

const BASE_URL = "https://www.seung-woo.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const postEntries = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated),
    images: post.thumbnail ? [post.thumbnail] : undefined,
  }));

  const tagEntries = getAllTags().map((tag) => {
    const tagPosts = getPostsByTag(tag);
    return {
      url: `${BASE_URL}/blog/tag/${encodeURIComponent(tag)}`,
      lastModified: tagPosts[0] ? new Date(tagPosts[0].updated) : new Date(),
    };
  });

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
    },
    ...postEntries,
    ...tagEntries,
  ];
}
