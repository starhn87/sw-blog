import { getDB } from "@/lib/db";
import { comments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const db = getDB(getRequestContext().env.DB);
  const result = await db
    .select()
    .from(comments)
    .where(eq(comments.slug, slug))
    .orderBy(desc(comments.createdAt));

  return Response.json(result);
}

export async function POST(request: Request) {
  const { slug, author, content, parentId } = (await request.json()) as {
    slug: string;
    author: string;
    content: string;
    parentId?: number;
  };
  if (!slug || !author || !content) {
    return Response.json(
      { error: "slug, author, content required" },
      { status: 400 },
    );
  }

  const db = getDB(getRequestContext().env.DB);
  const [created] = await db
    .insert(comments)
    .values({ slug, author, content, parentId: parentId ?? null })
    .returning();

  return Response.json(created, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const db = getDB(getRequestContext().env.DB);
  await db.delete(comments).where(eq(comments.id, Number(id)));

  return Response.json({ ok: true });
}
