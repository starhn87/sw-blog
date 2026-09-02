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
  assert.equal(response.headers.get("x-ssg-cache"), "HIT", `SSG streams without JSON parsing: ${path}`);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="ko"/);
  if (path === "/" || path === "/blog") {
    assert.ok(posts.some((post) => html.includes(`href="/blog/${post.slug}"`)), `Server-rendered post links: ${path}`);
    assert.ok((html.match(/<article[ >]/g) ?? []).length >= Math.min(path === "/" ? 5 : posts.length, posts.length), `Server-rendered post cards: ${path}`);
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
  assert.equal(missingPost.headers.get("x-ssg-cache"), "HIT");
  assert.match(missingPost.headers.get("cache-control"), /private.*no-store/);
  assert.equal(missingPost.headers.get("etag"), null);
  assert.match(await missingPost.text(), /<meta name="robots" content="noindex"/);
}

// Compare every segment with the build output: a full-page RSC payload can cause retry loops.
const buildId = (await readFile(".open-next/assets/BUILD_ID", "utf8")).trim();
const notFound = JSON.parse(await readFile(`.open-next/cache/${buildId}/_not-found.cache`, "utf8"));
const missingHtml = await request("/blog/migration-missing-post", { headers: { "If-None-Match": "*", "If-Modified-Since": new Date().toUTCString(), Range: "bytes=0-10" } }, 404);
assert.equal(await missingHtml.text(), notFound.html);
assert.equal(await (await request("/blog/migration-missing-post", { method: "HEAD" }, 404)).text(), "");
const missingRsc = await request("/blog/migration-missing-post", { headers: { RSC: "1" } }, 404);
assert.equal(missingRsc.headers.get("x-ssg-cache"), null, "Unregistered RSC navigation stays with Next");
assert.match(missingRsc.headers.get("content-type"), /text\/x-component/);
await missingRsc.body?.cancel();
for (const path of ["/about", "/blog/postgis-location-search"]) {
  const cached = JSON.parse(await readFile(`.open-next/cache/${buildId}${path}.cache`, "utf8"));
  for (const [segment, expected] of Object.entries(cached.segmentData)) {
    const response = await request(path, {
      redirect: "follow",
      headers: { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": segment },
    });
    assert.match(response.headers.get("content-type"), /text\/x-component/);
    assert.equal(response.headers.get("x-ssg-cache"), "HIT", `Segment cache: ${path} ${segment}`);
    assert.equal(await response.text(), expected, `Segment payload: ${path} ${segment}`);
    assert.match(response.headers.get("vary"), /RSC/i);
  }
  const full = await request(path, { redirect: "follow", headers: { RSC: "1" } });
  assert.match(full.headers.get("content-type"), /text\/x-component/);
  assert.equal(await full.text(), cached.rsc);
  const html = await request(path);
  assert.equal(await html.text(), cached.html, `HTML/RSC isolation: ${path}`);
  const head = await request(path, { method: "HEAD" });
  assert.equal(head.headers.get("x-ssg-cache"), "HIT");
  assert.equal(await head.text(), "");
  const htmlEtag = html.headers.get("etag");
  if (local) assert.ok(htmlEtag, `Local HTML ETag: ${path}`);
  if (htmlEtag) {
    const unchanged = await request(path, { headers: { "If-None-Match": htmlEtag } }, 304);
    assert.equal(await unchanged.text(), "");
  } else {
    console.warn(`HTML ETag absent at ${path}: browser HTML revalidation is not verified.`);
  }
  const rscEtag = full.headers.get("etag");
  assert.ok(rscEtag, `RSC ETag: ${path}`);
  const unchangedRsc = await request(path, { headers: { RSC: "1", "If-None-Match": rscEtag } }, 304);
  assert.equal(await unchangedRsc.text(), "");
  const ranged = await request(path, { headers: { Range: "bytes=0-10" } });
  assert.equal(await ranged.text(), cached.html, `Pages ignore range requests: ${path}`);
  const missingSegment = await request(path, { redirect: "follow", headers: { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/missing-segment" } }, 404);
  assert.equal(missingSegment.headers.get("x-ssg-cache"), null);
  await missingSegment.body?.cancel();
}

for (const path of ["/api/views", "/api/views?days=7", "/api/likes", "/api/comments"]) {
  const response = await request(path);
  assert.ok(Array.isArray(await response.json()), path);
  assert.ok(["MISS", "HIT"].includes(response.headers.get("x-stats-cache")), `Public stats cache: ${path}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const cached = await request(path);
  assert.equal(cached.headers.get("x-stats-cache"), "HIT", `Stats reuse: ${path}`);
  await cached.body?.cancel();
  const fresh = await request(path, { headers: { "Cache-Control": "no-cache" } });
  assert.equal(fresh.headers.get("x-api-runtime"), "worker", `No Next initialization: ${path}`);
  assert.equal(fresh.headers.get("x-stats-cache"), "BYPASS", `Read after mutation: ${path}`);
  assert.equal(fresh.headers.get("cache-control"), "private, no-store");
  await fresh.body?.cancel();
}
await (await request("/api/search?q=")).body?.cancel();
for (const path of ["/api/likes", "/api/comments"]) {
  const personalized = await request(`${path}?slug=${posts[0].slug}`);
  assert.equal(personalized.headers.get("x-api-runtime"), "worker");
  assert.equal(personalized.headers.get("x-stats-cache"), null);
  assert.equal(personalized.headers.get("cache-control"), "private, no-store");
  await personalized.body?.cancel();
}
for (const [path, allow] of [
  ["/api/views", "GET, HEAD, OPTIONS, POST"],
  ["/api/likes", "GET, HEAD, OPTIONS, POST"],
  ["/api/comments", "DELETE, GET, HEAD, OPTIONS, POST, PUT"],
  ["/api/comments/likes", "GET, HEAD, OPTIONS, POST"],
  ["/api/analytics", "GET, HEAD, OPTIONS, POST"],
]) {
  const options = await request(path, { method: "OPTIONS" }, 204);
  assert.equal(options.headers.get("allow"), allow);
  assert.equal(options.headers.get("x-api-runtime"), "worker");
}
const headStats = await request("/api/views", { method: "HEAD" });
assert.equal(headStats.headers.get("x-api-runtime"), "worker");
assert.equal(await headStats.text(), "");
const analytics = await request("/api/analytics");
assert.equal(analytics.headers.get("x-api-runtime"), "worker");
assert.ok(Array.isArray((await analytics.json()).events));
const invalidComment = await request("/api/comments/likes?commentId=invalid", {}, 400);
assert.equal(invalidComment.headers.get("x-api-runtime"), "worker");
await invalidComment.body?.cancel();
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
    const personalLike = await request(`/api/likes?slug=${slug}`, { headers: { cookie } });
    assert.equal(personalLike.headers.get("x-api-runtime"), "worker");
    assert.deepEqual(await personalLike.json(), { count: 1, liked: true });
    assert.deepEqual(await (await request(`/api/likes?slug=${slug}`, { headers: { cookie: `visitor_id=${randomUUID()}` } })).json(), { count: 1, liked: false });
    const comment = await (await request("/api/comments", json("POST", {
      slug, author: "Migration smoke test", content: "Local test only", password,
    }), 201)).json();
    commentId = comment.id;
    const reply = await (await request("/api/comments", json("POST", {
      slug, author: "Migration smoke test", content: "Local reply", password, parentId: commentId,
    }), 201)).json();
    assert.equal(reply.parentId, commentId);
    await request("/api/comments", json("PUT", { id: commentId, content: "Must not change", password: "wrong" }), 403);
    await request("/api/comments", json("DELETE", { id: commentId, password: "wrong" }), 403);
    await request("/api/comments", json("PUT", { id: commentId, content: "Updated local test", password }));
    const commentLike = await (await request("/api/comments/likes", json("POST", { commentId }))).json();
    assert.equal(commentLike.liked, true);
    const personalCommentLike = await request(`/api/comments/likes?commentId=${commentId}`, { headers: { cookie } });
    assert.equal(personalCommentLike.headers.get("x-api-runtime"), "worker");
    assert.deepEqual(await personalCommentLike.json(), { count: 1, liked: true });
    const comments = await (await request(`/api/comments?slug=${slug}`)).json();
    assert.equal(comments.length, 2);
  } finally {
    if (commentId) await request("/api/comments", json("DELETE", { id: commentId, password }));
    if (liked) await request("/api/likes", json("POST", { slug }));
  }
  assert.deepEqual(await (await request(`/api/comments?slug=${slug}`)).json(), []);
}

console.log(`Workers smoke passed: ${posts.length} posts, SEO, RSC, API reads, auth${local ? ", preview guards" : ""}${localMutations ? ", local D1 mutations + cleanup" : ""}.`);
