export const ANALYTICS_EVENTS = [
  "listing_view",
  "post_click",
  "recommendation_view",
  "engaged_read",
  "search_used",
  "search_no_results",
] as const;

export const ANALYTICS_SOURCES = [
  "home",
  "blog",
  "tag",
  "related",
  "series",
  "search",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];
export type AnalyticsEventInput =
  | { event: "listing_view"; source: "home" | "blog" | "tag" }
  | { event: "post_click"; slug: string; source: AnalyticsSource }
  | {
      event: "recommendation_view";
      slug: string;
      source: "related" | "series";
    }
  | { event: "engaged_read"; slug: string }
  | { event: "search_used" | "search_no_results" };

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENTS as readonly string[]).includes(value)
  );
}

export function isAnalyticsSource(value: unknown): value is AnalyticsSource {
  return (
    typeof value === "string" &&
    (ANALYTICS_SOURCES as readonly string[]).includes(value)
  );
}

export function isValidPostSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,100}$/.test(value);
}

export function trackAnalyticsEvent(input: AnalyticsEventInput): void {
  const key = `analytics:v1:${input.event}:${"slug" in input ? input.slug : ""}:${"source" in input ? input.source : ""}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "true");

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    sessionStorage.removeItem(key);
  });
}
