export const ANALYTICS_EVENTS = [
  "listing_view",
  "post_click",
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
