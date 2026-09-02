import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";

const origin = new URL(process.argv[2] ?? "http://localhost:8792");
const localMutations = process.argv.includes("--local-mutations");
const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
if (localMutations && !local) {
  throw new Error("Mutation smoke tests are only allowed against localhost.");
}

async function request(path, options = {}, expected = 200) {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    ...options,
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, expected, `${options.method ?? "GET"} ${path}`);
  return response;
}

const posts = JSON.parse(await readFile("public/search-index.json", "utf8"));
for (const path of ["/", "/blog", "/blog/tag", "/about", "/admin", ...posts.map((post) => `/blog/${post.slug}`)]) {
  const response = await request(path);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("x-nextjs-cache"), "HIT", `SSG cache: ${path}`);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/);
  if (path === "/" || path === "/blog") {
    assert.ok(posts.some((post) => html.includes(`/blog/${post.slug}`)), `Post list: ${path}`);
  }
  if (path.startsWith("/blog/") && path !== "/blog/tag") {
    assert.ok(html.includes(`https://www.seung-woo.me${path}`), `canonical: ${path}`);
  }
  if (path === "/admin") assert.match(html, /noindex/);
}

for (const [path, type] of [["/feed.xml", "application/rss+xml"], ["/sitemap.xml", "application/xml"], ["/robots.txt", "text/plain"]]) {
  const response = await request(path);
  assert.ok(response.headers.get("content-type").startsWith(type), path);
  await response.body?.cancel();
}
await (await request("/migration-missing-page", {}, 404)).body?.cancel();
for (let attempt = 0; attempt < 3; attempt++) {
  const missingPost = await request("/blog/migration-missing-post", {}, 404);
  assert.equal(missingPost.headers.get("x-nextjs-cache"), "HIT");
  await missingPost.body?.cancel();
}

// A full-page RSC response here makes Next.js repeatedly retry segment prefetches.
const tree = await request("/about", {
  redirect: "follow",
  headers: { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/_tree" },
});
assert.match(tree.headers.get("content-type"), /text\/x-component/);
assert.match(await tree.text(), /0:\{"tree":/);

for (const path of ["/api/views", "/api/likes", "/api/comments", "/api/search?q="]) {
  const response = await request(path);
  assert.ok(await response.json(), path);
}
await request("/api/media?list=1", {}, 401);
for (const path of ["/api/search/index", "/api/chat/index", "/api/push/subscribe"]) {
  // Check auth without calling AI, Vectorize, or any notification provider.
  if (local) await request(path, { method: "POST" }, 401);
}

if (local) {
  // Node fetch normalizes Host to the URL hostname; use HTTP for virtual-host probes.
  const hostRequest = (path, host, method = "GET") => new Promise((resolve, reject) => {
    const req = httpRequest(new URL(path, origin), { method, headers: { host }, timeout: 10_000 }, (res) => {
      res.resume();
      res.on("end", () => resolve(res));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Host probe timed out")));
    req.end();
  });
  const host = "sw-blog-preview.example.workers.dev";
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await hostRequest("/api/comments", host, method);
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers["x-robots-tag"], "noindex, nofollow");
  }
  const asset = await hostRequest("/logo.svg", host);
  assert.equal(asset.statusCode, 200);
  assert.equal(asset.headers["x-robots-tag"], "noindex, nofollow");
  const redirect = await hostRequest("/blog/motomap?q=map", "sw-blog.pages.dev");
  assert.equal(redirect.statusCode, 301);
  assert.equal(redirect.headers.location, "https://www.seung-woo.me/blog/motomap?q=map");
}

if (localMutations) {
  const slug = `migration-smoke-${randomUUID()}`;
  const cookie = `visitor_id=${randomUUID()}`;
  const password = randomUUID();
  const json = (method, body) => ({
    method,
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  let commentId;
  let liked = false;
  try {
    const like = await (await request("/api/likes", json("POST", { slug }))).json();
    liked = like.liked;
    assert.equal(liked, true);
    const comment = await (await request("/api/comments", json("POST", {
      slug, author: "Migration smoke test", content: "Local test only", password,
    }), 201)).json();
    commentId = comment.id;
    const reply = await (await request("/api/comments", json("POST", {
      slug, author: "Migration smoke test", content: "Local reply", password, parentId: commentId,
    }), 201)).json();
    assert.equal(reply.parentId, commentId);
    await request("/api/comments", json("PUT", { id: commentId, content: "Updated local test", password }));
    const commentLike = await (await request("/api/comments/likes", json("POST", { commentId }))).json();
    assert.equal(commentLike.liked, true);
    const comments = await (await request(`/api/comments?slug=${slug}`)).json();
    assert.equal(comments.length, 2);
  } finally {
    if (commentId) await request("/api/comments", json("DELETE", { id: commentId, password }));
    if (liked) await request("/api/likes", json("POST", { slug }));
  }
  assert.deepEqual(await (await request(`/api/comments?slug=${slug}`)).json(), []);
}

console.log(`Workers smoke passed: ${posts.length} posts, SEO, RSC, API reads, auth${local ? ", preview guards" : ""}${localMutations ? ", local D1 mutations + cleanup" : ""}.`);
