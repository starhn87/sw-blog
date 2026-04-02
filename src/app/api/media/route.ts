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
    const prefix = folder ? `${folder}/` : "";
    const bucket = getRequestContext().env.MEDIA;
    const listed = await bucket.list({
      prefix: prefix || undefined,
      delimiter: "/",
      limit: 500,
    });

    const folders = (listed.delimitedPrefixes ?? []).map((p) => p.replace(/\/$/, ""));
    const items = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    }));

    return Response.json({ folders, items });
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

  const { key, folder, keys, folders } = (await request.json()) as {
    key?: string;
    folder?: string;
    keys?: string[];
    folders?: string[];
  };

  const bucket = getRequestContext().env.MEDIA;
  const allKeys: string[] = [];

  // 단일/복수 파일
  if (key) allKeys.push(key);
  if (keys) allKeys.push(...keys);

  // 단일/복수 폴더 → 하위 파일 수집
  const folderList = folder ? [folder] : folders ?? [];
  for (const f of folderList) {
    const listed = await bucket.list({ prefix: `${f}/`, limit: 500 });
    allKeys.push(...listed.objects.map((obj) => obj.key));
  }

  if (allKeys.length === 0) {
    return Response.json({ error: "key or folder required" }, { status: 400 });
  }

  await bucket.delete(allKeys);

  return Response.json({ success: true, deleted: allKeys.length });
}
