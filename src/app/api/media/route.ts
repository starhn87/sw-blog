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
    const allItems = listed.objects
      .filter((obj) => !obj.key.endsWith(".order.json"))
      .map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
      }));

    // 저장된 순서 적용
    const orderKey = prefix ? `${prefix}.order.json` : ".order.json";
    const orderObj = await bucket.get(orderKey);
    let items = allItems;
    if (orderObj) {
      const order = (await orderObj.json()) as string[];
      const orderMap = new Map(order.map((k, i) => [k, i]));
      items = [...allItems].sort((a, b) => {
        const ai = orderMap.get(a.key) ?? Infinity;
        const bi = orderMap.get(b.key) ?? Infinity;
        return ai - bi;
      });
    }

    return Response.json({ folders, items });
  }

  if (!key) {
    return Response.json({ error: "key required" }, { status: 400 });
  }

  const bucket = getRequestContext().env.MEDIA;
  const range = request.headers.get("Range");

  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : undefined;
      const object = await bucket.get(key, {
        range: { offset: start, length: end !== undefined ? end - start + 1 : undefined },
      });
      if (!object) return new Response("Not Found", { status: 404 });
      const size = object.size;
      const actualEnd = end !== undefined ? end : size - 1;
      return new Response(object.body, {
        status: 206,
        headers: {
          "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
          "Content-Range": `bytes ${start}-${actualEnd}/${size}`,
          "Content-Length": String(actualEnd - start + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const object = await bucket.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Accept-Ranges": "bytes",
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

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    folder?: string;
    order?: string[];
    renameFolder?: { from: string; to: string };
  };

  const bucket = getRequestContext().env.MEDIA;

  if (body.renameFolder) {
    const { from, to } = body.renameFolder;
    const listed = await bucket.list({ prefix: `${from}/`, limit: 1000 });
    if (listed.objects.length === 0) {
      return Response.json({ error: "folder not found" }, { status: 404 });
    }

    for (const obj of listed.objects) {
      const newKey = obj.key.replace(from, to);
      const data = await bucket.get(obj.key);
      if (!data) continue;
      await bucket.put(newKey, await data.arrayBuffer(), {
        httpMetadata: data.httpMetadata,
      });
    }

    await bucket.delete(listed.objects.map((obj) => obj.key));
    return Response.json({ success: true });
  }

  const { folder, order } = body;
  if (!order) {
    return Response.json({ error: "order required" }, { status: 400 });
  }

  const orderKey = folder ? `${folder}/.order.json` : ".order.json";
  await bucket.put(orderKey, JSON.stringify(order), {
    httpMetadata: { contentType: "application/json" },
  });

  return Response.json({ success: true });
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
