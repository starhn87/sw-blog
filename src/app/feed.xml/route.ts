import { getAllPosts } from "@/lib/mdx";

const BASE_URL = "https://www.seung-woo.me";

export function GET() {
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>이승우의 블로그</title>
    <link>${BASE_URL}</link>
    <description>개발, 여행, 일상 — 기록하고 싶은 모든 것을 담는 블로그</description>
    <language>ko</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
