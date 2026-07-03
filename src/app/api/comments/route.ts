import { getDB } from "@/lib/db";
import { comments, commentLikes } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { hashPassword, getOrCreateVisitorId } from "@/lib/auth";
import { notifyActivity } from "@/lib/push";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const db = getDB(getRequestContext().env.DB);

  // slug 없이 호출하면 글별 댓글 수 집계를 반환한다
  if (!slug) {
    const rows = await db
      .select({ slug: comments.slug, count: sql<number>`COUNT(*)` })
      .from(comments)
      .groupBy(comments.slug);
    return Response.json(rows);
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  const result = await db
    .select({
      id: comments.id,
      slug: comments.slug,
      author: comments.author,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      likeCount: sql<number>`COUNT(${commentLikes.id})`,
      liked: sql<number>`COALESCE(MAX(CASE WHEN ${commentLikes.visitorId} = ${visitorId} THEN 1 ELSE 0 END), 0)`,
    })
    .from(comments)
    .leftJoin(commentLikes, eq(commentLikes.commentId, comments.id))
    .where(eq(comments.slug, slug))
    .groupBy(comments.id)
    .orderBy(desc(comments.createdAt));

  const response = Response.json(
    result.map((c) => ({ ...c, liked: !!c.liked })),
  );
  if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
  return response;
}

export async function POST(request: Request) {
  const { slug, author, content, password, parentId } =
    (await request.json()) as {
      slug: string;
      author: string;
      content: string;
      password: string;
      parentId?: number;
    };
  if (!slug || !author || !content || !password) {
    return Response.json(
      { error: "slug, author, content, password required" },
      { status: 400 },
    );
  }

  const trimmedAuthor = author.trim();
  const trimmedContent = content.trim();
  if (!trimmedAuthor || !trimmedContent) {
    return Response.json(
      { error: "author, content는 비어 있을 수 없습니다" },
      { status: 400 },
    );
  }
  if (trimmedAuthor.length > 50 || trimmedContent.length > 2000) {
    return Response.json(
      { error: "author는 50자, content는 2000자 이내여야 합니다" },
      { status: 400 },
    );
  }

  const { env, ctx } = getRequestContext();
  const db = getDB(env.DB);
  const hashed = await hashPassword(password);
  const [created] = await db
    .insert(comments)
    .values({
      slug,
      author: trimmedAuthor,
      content: trimmedContent,
      password: hashed,
      parentId: parentId ?? null,
    })
    .returning({
      id: comments.id,
      slug: comments.slug,
      author: comments.author,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
    });

  ctx.waitUntil(
    notifyActivity(env, {
      kind: parentId ? "reply" : "comment",
      slug,
      author: trimmedAuthor,
      content: trimmedContent,
    }),
  );

  return Response.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const { id, content, password } = (await request.json()) as {
    id: number;
    content: string;
    password: string;
  };
  if (!id || !content || !password) {
    return Response.json(
      { error: "id, content, password required" },
      { status: 400 },
    );
  }

  const trimmedContent = content.trim();
  if (!trimmedContent || trimmedContent.length > 2000) {
    return Response.json(
      { error: "content는 1~2000자여야 합니다" },
      { status: 400 },
    );
  }

  const db = getDB(getRequestContext().env.DB);
  const [existing] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id));
  if (!existing) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const hashed = await hashPassword(password);
  if (hashed !== existing.password) {
    return Response.json({ error: "wrong password" }, { status: 403 });
  }

  await db
    .update(comments)
    .set({ content: trimmedContent })
    .where(eq(comments.id, id));

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id, password } = (await request.json()) as {
    id: number;
    password: string;
  };
  if (!id || !password) {
    return Response.json(
      { error: "id, password required" },
      { status: 400 },
    );
  }

  const db = getDB(getRequestContext().env.DB);
  const [existing] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id));
  if (!existing) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const hashed = await hashPassword(password);
  if (hashed !== existing.password) {
    return Response.json({ error: "wrong password" }, { status: 403 });
  }

  await db.delete(comments).where(eq(comments.id, id));

  return Response.json({ ok: true });
}
