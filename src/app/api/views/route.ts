import { getDB } from "@/lib/db";
import { views } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const db = getDB(getRequestContext().env.DB);

  // slug 없이 호출하면 조회수 상위 글 목록을 반환한다
  if (!slug) {
    const limitParam = Number(searchParams.get("limit"));
    const rows = await db
      .select()
      .from(views)
      .orderBy(desc(views.count))
      .limit(limitParam > 0 ? Math.min(limitParam, 100) : 1000);
    return Response.json(rows);
  }

  const result = await db.select().from(views).where(eq(views.slug, slug));
  const count = result[0]?.count ?? 0;

  return Response.json({ count });
}

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug: string };
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const db = getDB(getRequestContext().env.DB);
  await db
    .insert(views)
    .values({ slug, count: 1 })
    .onConflictDoUpdate({
      target: views.slug,
      set: { count: sql`${views.count} + 1` },
    });

  const result = await db.select().from(views).where(eq(views.slug, slug));
  return Response.json({ count: result[0]?.count ?? 1 });
}
