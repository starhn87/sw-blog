import { getDB } from "@/lib/db";
import { comments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const db = getDB(getRequestContext().env.DB);
  const result = await db
    .select({
      id: comments.id,
      slug: comments.slug,
      author: comments.author,
      content: comments.content,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
    })
    .from(comments)
    .where(eq(comments.slug, slug))
    .orderBy(desc(comments.createdAt));

  return Response.json(result);
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

  const db = getDB(getRequestContext().env.DB);
  const hashed = await hashPassword(password);
  const [created] = await db
    .insert(comments)
    .values({
      slug,
      author,
      content,
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
    .set({ content })
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
