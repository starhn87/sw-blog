import { getDB } from "@/lib/db";
import { commentLikes } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId");
  if (!commentId)
    return Response.json({ error: "commentId required" }, { status: 400 });

  const visitorId =
    request.headers.get("cf-connecting-ip") ?? "unknown";
  const db = getDB(getCloudflareContext().env.DB);

  const [result] = await db
    .select({ count: count() })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, Number(commentId)));

  const [existing] = await db
    .select()
    .from(commentLikes)
    .where(
      and(
        eq(commentLikes.commentId, Number(commentId)),
        eq(commentLikes.visitorId, visitorId),
      ),
    );

  return Response.json({
    count: result.count,
    liked: !!existing,
  });
}

export async function POST(request: Request) {
  const { commentId } = (await request.json()) as { commentId: number };
  if (!commentId)
    return Response.json({ error: "commentId required" }, { status: 400 });

  const visitorId =
    request.headers.get("cf-connecting-ip") ?? "unknown";
  const db = getDB(getCloudflareContext().env.DB);

  const [existing] = await db
    .select()
    .from(commentLikes)
    .where(
      and(
        eq(commentLikes.commentId, commentId),
        eq(commentLikes.visitorId, visitorId),
      ),
    );

  if (existing) {
    await db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.visitorId, visitorId),
        ),
      );
  } else {
    await db.insert(commentLikes).values({ commentId, visitorId });
  }

  const [result] = await db
    .select({ count: count() })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, commentId));

  return Response.json({
    count: result.count,
    liked: !existing,
  });
}
