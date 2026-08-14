import { getDB } from "@/lib/db";
import { commentLikes, comments } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getOrCreateVisitorId } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("commentId");
  const id = Number(commentId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "invalid commentId" }, { status: 400 });
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const db = getDB(getRequestContext().env.DB);
  const [comment] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.id, id));
  if (!comment) {
    return Response.json({ error: "comment not found" }, { status: 404 });
  }

  const [result] = await db
    .select({ count: count() })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, id));

  const [existing] = await db
    .select()
    .from(commentLikes)
    .where(
      and(
        eq(commentLikes.commentId, id),
        eq(commentLikes.visitorId, visitorId),
      ),
    );

  const response = Response.json({
    count: result.count,
    liked: !!existing,
  });
  if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}

export async function POST(request: Request) {
  const { commentId } = (await request.json()) as { commentId: number };
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return Response.json({ error: "invalid commentId" }, { status: 400 });
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const db = getDB(getRequestContext().env.DB);
  const [comment] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!comment) {
    return Response.json({ error: "comment not found" }, { status: 404 });
  }

  const inserted = await db
    .insert(commentLikes)
    .values({ commentId, visitorId })
    .onConflictDoNothing({
      target: [commentLikes.commentId, commentLikes.visitorId],
    })
    .returning({ id: commentLikes.id });

  if (inserted.length === 0) {
    await db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.visitorId, visitorId),
        ),
      );
  }

  const [[result], [userLike]] = await Promise.all([
    db
      .select({ count: count() })
      .from(commentLikes)
      .where(eq(commentLikes.commentId, commentId)),
    db
      .select({ id: commentLikes.id })
      .from(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.visitorId, visitorId),
        ),
      ),
  ]);

  const response = Response.json({
    count: result.count,
    liked: !!userLike,
  });
  if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}
