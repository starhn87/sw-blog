import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

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
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return Response.json({ error: "file required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "";
  const timestamp = Date.now();
  const key = folder
    ? `${folder}/${timestamp}-${file.name}`
    : `${timestamp}-${file.name}`;

  const bucket = getRequestContext().env.MEDIA;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key, url: `/api/media?key=${encodeURIComponent(key)}` });
}

export async function DELETE(request: Request) {
  const { key } = (await request.json()) as { key: string };

  if (!key) {
    return Response.json({ error: "key required" }, { status: 400 });
  }

  const bucket = getRequestContext().env.MEDIA;
  await bucket.delete(key);

  return Response.json({ success: true });
}
