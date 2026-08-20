export function getAnalyticsDay(offset = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function hashDailyVisitor(
  visitorId: string,
  day: string,
): Promise<string> {
  const value = new TextEncoder().encode(`${day}:${visitorId}`);
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
