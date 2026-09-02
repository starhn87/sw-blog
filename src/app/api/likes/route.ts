import { getDB } from "@/lib/db";
import { likes } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOrCreateVisitorId } from "@/lib/auth";
import { notifyActivity } from "@/lib/push";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const db = getDB(getCloudflareContext().env.DB);

  // slug 없이 호출하면 글별 좋아요 수 집계를 반환한다
  if (!slug) {
    const rows = await db
      .select({ slug: likes.slug, count: count() })
      .from(likes)
      .groupBy(likes.slug);
    return Response.json(rows);
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);

  const [total] = await db
    .select({ count: count() })
    .from(likes)
    .where(eq(likes.slug, slug));

  const [userLike] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId)));

  const response = Response.json({
    count: total?.count ?? 0,
    liked: !!userLike,
  });
  if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug: string };
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const { env, ctx } = getCloudflareContext();
  const db = getDB(env.DB);

  const inserted = await db
    .insert(likes)
    .values({ slug, visitorId })
    .onConflictDoNothing({ target: [likes.slug, likes.visitorId] })
    .returning({ id: likes.id });

  if (inserted.length === 0) {
    await db
      .delete(likes)
      .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId)));
  }

  const [[total], [userLike]] = await Promise.all([
    db.select({ count: count() }).from(likes).where(eq(likes.slug, slug)),
    db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId))),
  ]);
  if (inserted.length > 0 && userLike) {
    ctx.waitUntil(notifyActivity(env, { kind: "like", slug }, visitorId));
  }

  const response = Response.json({
    count: total?.count ?? 0,
    liked: !!userLike,
  });
  if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}
