export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  setCookieHeader: string | null;
} {
  const existing = readVisitorCookie(request);
  if (existing) return { id: existing, setCookieHeader: null };

  const id = crypto.randomUUID();
  const isSecure = new URL(request.url).protocol === "https:";
  const setCookieHeader = [
    `${VISITOR_COOKIE}=${id}`,
    "Path=/",
    `Max-Age=${VISITOR_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
    isSecure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return { id, setCookieHeader };
}
