export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 관리자 검증. x-admin-password 헤더를 env.ADMIN_PASSWORD와 비교하되, 헤더·설정값이
// 모두 있어야 통과시킨다(둘 중 하나라도 비면 false). null-guard가 없으면 env 미설정 시
// 빈 헤더(undefined === undefined)로 우회될 수 있다.
export function isAdmin(request: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const password = request.headers.get("x-admin-password");
  const adminPassword = env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  return !!password && !!adminPassword && password === adminPassword;
}

const VISITOR_COOKIE = "visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readVisitorCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`),
  );
  return match ? match[1] : null;
}

export function getOrCreateVisitorId(request: Request): {
  id: string;
  setCookieHeader: string;
} {
  const existing = readVisitorCookie(request);
  const id = existing ?? crypto.randomUUID();
  const url = new URL(request.url);
  const isSecure = url.protocol === "https:";
  // apex와 서브도메인이 쿠키를 공유하도록 Domain을 지정한다. 이게 없으면 host-only라
  // www.seung-woo.me와 seung-woo.me가 서로 다른 visitor_id를 갖게 돼, 두 주소를 오갈 때
  // 좋아요가 풀리고 중복으로 눌린다. 기존 host-only 쿠키 값을 그대로 읽어 재설정하므로
  // 이미 누른 좋아요는 유지된다. localhost 등에선 Domain을 붙이지 않는다.
  const domainAttr = url.hostname.endsWith("seung-woo.me")
    ? "Domain=.seung-woo.me"
    : null;
  // 매 요청마다 Max-Age를 다시 내려보내 sliding expiration으로 동작시킨다.
  // 이렇게 안 하면 최초 발급 시점의 Max-Age가 그대로라, 기간이 지나면 쿠키가
  // 사라지고 새 visitorId가 발급돼 좋아요가 풀린다.
  const setCookieHeader = [
    `${VISITOR_COOKIE}=${id}`,
    "Path=/",
    `Max-Age=${VISITOR_COOKIE_MAX_AGE}`,
    domainAttr,
    "HttpOnly",
    "SameSite=Lax",
    isSecure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return { id, setCookieHeader };
}
