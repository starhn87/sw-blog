import { eq } from "drizzle-orm";
import { getDB } from "@/lib/db";
import { pushSubscriptions } from "@/lib/schema";
import { logError } from "@/lib/log";

const BLOG_ORIGIN = "https://www.seung-woo.me";
const VAPID_PUBLIC_KEY =
  "BKT9nzN7VDCOKvG0NPqNz0Ll1O3zACtd1EOkCfc0mpC-aewUnDG25Zhmf5aoZHGVJPoFBfcQwj77YW2OYKDFhhk";

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

const encoder = new TextEncoder();

// crypto.subtle 인자는 BufferSource(ArrayBuffer 기반)여야 하므로, 바이트는 항상
// 명시적 ArrayBuffer 위에 만든다(TS의 Uint8Array<ArrayBufferLike> 불일치 회피).
function utf8(s: string): Uint8Array<ArrayBuffer> {
  const src = encoder.encode(s);
  const out = new Uint8Array(new ArrayBuffer(src.length));
  out.set(src);
  return out;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = "===".slice((s.length + 3) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrs: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// HKDF(Extract+Expand). crypto.subtle을 globalThis에서 전역 직접 호출한다
// (변수/프로퍼티로 담으면 next-on-pages esbuild 번들에서 this가 끊겨 Illegal invocation).
async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// RFC 8291 aes128gcm 페이로드 암호화
async function encryptPayload(
  payload: Uint8Array<ArrayBuffer>,
  p256dh: string,
  auth: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);

  const asKeys = await globalThis.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const asPublic = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", asKeys.publicKey),
  );

  const uaKey = await globalThis.crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await globalThis.crypto.subtle.deriveBits(
      { name: "ECDH", public: uaKey },
      asKeys.privateKey,
      256,
    ),
  );

  // IKM = HKDF(auth, shared, "WebPush: info\0" || ua_public || as_public)
  const keyInfo = concat(utf8("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = globalThis.crypto.getRandomValues(
    new Uint8Array(new ArrayBuffer(16)),
  );
  const cek = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);

  const plaintext = concat(payload, new Uint8Array([0x02])); // 마지막 레코드 구분자
  const cekKey = await globalThis.crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cekKey,
      plaintext,
    ),
  );

  // aes128gcm 헤더: salt(16) | rs(4, BE) | idlen(1) | keyid(as_public, 65)
  const rs = new Uint8Array(new ArrayBuffer(4));
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return concat(header, ciphertext);
}

// VAPID JWT(ES256) Authorization 헤더
async function vapidAuth(
  endpoint: string,
  privateJwk: JsonWebKey,
  subject: string,
): Promise<string> {
  const { protocol, host } = new URL(endpoint);
  const header = bytesToB64url(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = bytesToB64url(
    utf8(JSON.stringify({ aud: `${protocol}//${host}`, exp, sub: subject })),
  );
  const signingInput = `${header}.${payload}`;
  const key = await globalThis.crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await globalThis.crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      utf8(signingInput),
    ),
  );
  return `vapid t=${signingInput}.${bytesToB64url(sig)}, k=${VAPID_PUBLIC_KEY}`;
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
  actorVisitorId?: string,
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
    payload = { title: `${label} 💬`, body: `${activity.author}: ${preview}`, url };
  }

  await sendPush(env, payload, actorVisitorId);
}

async function sendPush(
  env: CloudflareEnv,
  payload: PushPayload,
  actorVisitorId?: string,
): Promise<void> {
  const db = getDB(env.DB);
  const subs = await db.select().from(pushSubscriptions);
  // 본인 활동엔 알림하지 않는다: actor가 구독자 중 하나면 건너뛴다
  if (actorVisitorId && subs.some((s) => s.visitorId === actorVisitorId)) return;
  const privateJwk = JSON.parse(env.VAPID_PRIVATE_KEY) as JsonWebKey;
  const subject = env.VAPID_SUBJECT;
  const payloadBytes = utf8(JSON.stringify(payload));

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const body = await encryptPayload(payloadBytes, sub.p256dh, sub.auth);
        const authorization = await vapidAuth(sub.endpoint, privateJwk, subject);
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
          },
          body: body as BodyInit,
        });
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
