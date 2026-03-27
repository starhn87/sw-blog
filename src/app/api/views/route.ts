import { getDB } from "@/lib/db";
import { views } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const db = getDB(getCloudflareContext().env.DB);
  const result = await db.select().from(views).where(eq(views.slug, slug));
  const count = result[0]?.count ?? 0;

  return Response.json({ count });
}

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug: string };
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const db = getDB(getCloudflareContext().env.DB);
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
