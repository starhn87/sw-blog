import { getDB } from "@/lib/db";
import { likes } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function getVisitorId(request: Request): string {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  return ip;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const visitorId = getVisitorId(request);
  const db = getDB(getCloudflareContext().env.DB);

  const [total] = await db
    .select({ count: count() })
    .from(likes)
    .where(eq(likes.slug, slug));

  const [userLike] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId)));

  return Response.json({
    count: total?.count ?? 0,
    liked: !!userLike,
  });
}

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug: string };
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const visitorId = getVisitorId(request);
  const db = getDB(getCloudflareContext().env.DB);

  const [existing] = await db
    .select()
    .from(likes)
    .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId)));

  if (existing) {
    await db
      .delete(likes)
      .where(and(eq(likes.slug, slug), eq(likes.visitorId, visitorId)));
  } else {
    await db.insert(likes).values({ slug, visitorId });
  }

  const [total] = await db
    .select({ count: count() })
    .from(likes)
    .where(eq(likes.slug, slug));

  return Response.json({
    count: total?.count ?? 0,
    liked: !existing,
  });
}
