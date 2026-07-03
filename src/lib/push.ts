import { buildPushHTTPRequest } from "@pushforge/builder";
import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { logError } from "@/lib/log";

const BLOG_ORIGIN = "https://www.seung-woo.me";

interface PushPayload {
  title: string;
  body: string;
  url: string;
  [key: string]: string;
}

let titleCache: Map<string, string> | null = null;

async function getPostTitle(slug: string): Promise<string> {
  if (!titleCache) {
    try {
      const r = await fetch(`${BLOG_ORIGIN}/search-index.json`);
      const items = (await r.json()) as { slug: string; title: string }[];
      titleCache = new Map(items.map((i) => [i.slug, i.title]));
    } catch {
      return slug;
    }
  }
  return titleCache.get(slug) ?? slug;
}

export type Activity =
  | { kind: "like"; slug: string }
  | { kind: "comment" | "reply"; slug: string; author: string; content: string };

// 활동을 알림 문구로 만들어 저장된 모든 구독에 발송한다.
export async function notifyActivity(
  env: CloudflareEnv,
  activity: Activity,
): Promise<void> {
  const postTitle = await getPostTitle(activity.slug);
  const url = `/blog/${activity.slug}`;

  let payload: PushPayload;
  if (activity.kind === "like") {
    payload = {
      title: "새 좋아요 ❤️",
      body: `'${postTitle}'에 좋아요가 달렸어요`,
      url,
    };
  } else {
    const label = activity.kind === "reply" ? "새 답글" : "새 댓글";
    const preview =
      activity.content.length > 50
        ? `${activity.content.slice(0, 50)}...`
        : activity.content;
    payload = {
      title: `${label} 💬`,
      body: `${activity.author}: ${preview}`,
      url,
    };
  }

  await sendPush(env, payload);
}

async function sendPush(
  env: CloudflareEnv,
  payload: PushPayload,
): Promise<void> {
  const privateJWK = JSON.parse(env.VAPID_PRIVATE_KEY) as JsonWebKey;
  const db = getDB(env.DB);
  const subs = await db.select().from(pushSubscriptions);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const { endpoint, headers, body } = await buildPushHTTPRequest({
          privateJWK,
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message: {
            payload,
            adminContact: env.VAPID_SUBJECT,
          },
        });
        const res = await fetch(endpoint, { method: "POST", headers, body });
        if (res.status === 404 || res.status === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      } catch (error) {
        logError("push/send", error, { endpoint: sub.endpoint });
      }
    }),
  );
}
