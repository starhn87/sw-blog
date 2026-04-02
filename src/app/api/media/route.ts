import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

function isAuthorized(request: Request): boolean {
  const password = request.headers.get("x-admin-password");
  const adminPassword =
    getRequestContext().env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  return !!password && !!adminPassword && password === adminPassword;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const list = searchParams.get("list");

  if (list) {
    if (!isAuthorized(request)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const folder = searchParams.get("folder") ?? "";
    const bucket = getRequestContext().env.MEDIA;
    const listed = await bucket.list({
      prefix: folder ? `${folder}/` : undefined,
      limit: 500,
    });

    const items = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));

    return Response.json({ items });
  }

  if (!key) {
    return Response.json({ error: "key required" }, { status: 400 });
  }

  const bucket = getRequestContext().env.MEDIA;
  const object = await bucket.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const folder = formData.get("folder") as string | null;

  if (files.length === 0) {
    return Response.json({ error: "files required" }, { status: 400 });
  }

  const bucket = getRequestContext().env.MEDIA;
  const results = [];

  for (const file of files) {
    const timestamp = Date.now();
    const key = folder
      ? `${folder}/${timestamp}-${file.name}`
      : `${timestamp}-${file.name}`;

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    results.push({ key, url: `/api/media?key=${encodeURIComponent(key)}` });
  }

  return Response.json({ items: results });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key } = (await request.json()) as { key: string };

  if (!key) {
    return Response.json({ error: "key required" }, { status: 400 });
  }

  const bucket = getRequestContext().env.MEDIA;
  await bucket.delete(key);

  return Response.json({ success: true });
}
