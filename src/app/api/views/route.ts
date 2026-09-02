import { getDB } from "@/lib/db";
import { dailyViews, views } from "@/lib/schema";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOrCreateVisitorId } from "@/lib/auth";
import { isValidPostSlug } from "@/lib/analytics";
import { getAnalyticsDay, hashDailyVisitor } from "@/lib/analytics.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const db = getDB(getCloudflareContext().env.DB);

  // slug 없이 호출하면 조회수 상위 글 목록을 반환한다
  if (!slug) {
    const limitParam = Number(searchParams.get("limit"));
    const daysParam = Number(searchParams.get("days"));
    const limit = limitParam > 0 ? Math.min(limitParam, 100) : 1000;
    if (Number.isInteger(daysParam) && daysParam > 0) {
      const days = Math.min(daysParam, 31);
      const rows = await db
        .select({ slug: dailyViews.slug, count: count() })
        .from(dailyViews)
        .where(gte(dailyViews.day, getAnalyticsDay(-(days - 1))))
        .groupBy(dailyViews.slug)
        .orderBy(desc(count()))
        .limit(limit);
      return Response.json(rows);
    }
    const rows = await db
      .select()
      .from(views)
      .orderBy(desc(views.count))
      .limit(limit);
    return Response.json(rows);
  }

  const result = await db.select().from(views).where(eq(views.slug, slug));
  const viewCount = result[0]?.count ?? 0;

  return Response.json({ count: viewCount });
}

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug: unknown };
  if (!isValidPostSlug(slug)) {
    return Response.json({ error: "valid slug required" }, { status: 400 });
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const day = getAnalyticsDay();
  const visitorHash = await hashDailyVisitor(visitorId, day);
  const db = getDB(getCloudflareContext().env.DB);
  await db.batch([
    db
      .insert(views)
      .values({ slug, count: 1 })
      .onConflictDoUpdate({
        target: views.slug,
        set: { count: sql`${views.count} + 1` },
      }),
    db
      .insert(dailyViews)
      .values({ day, slug, visitorHash })
      .onConflictDoNothing({
        target: [dailyViews.day, dailyViews.slug, dailyViews.visitorHash],
      }),
  ]);

  const result = await db.select().from(views).where(eq(views.slug, slug));
  const response = Response.json({ count: result[0]?.count ?? 1 });
  response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}
