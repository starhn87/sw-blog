import { getDB } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { logError } from "@/lib/log";
import { getOrCreateVisitorId, isAdmin } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const { env } = getRequestContext();
  if (!isAdmin(request, env)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const sub = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "invalid subscription" }, { status: 400 });
  }

  const { id: visitorId, setCookieHeader } = getOrCreateVisitorId(request);
  try {
    const db = getDB(env.DB);
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        visitorId,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, visitorId },
      });
    const response = Response.json({ ok: true });
    if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
    return response;
  } catch (error) {
    logError("push/subscribe", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { env } = getRequestContext();
  if (!isAdmin(request, env)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) {
    return Response.json({ error: "endpoint required" }, { status: 400 });
  }

  const db = getDB(env.DB);
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  return Response.json({ ok: true });
}
