import { describe, expect, it } from "vitest";
import {
  isAnalyticsEvent,
  isAnalyticsSource,
  isValidPostSlug,
} from "./analytics";
import { hashDailyVisitor } from "./analytics.server";

describe("reader analytics validation", () => {
  it("accepts only known events and sources", () => {
    expect(isAnalyticsEvent("engaged_read")).toBe(true);
    expect(isAnalyticsEvent("recommendation_view")).toBe(true);
    expect(isAnalyticsEvent("page_view")).toBe(false);
    expect(isAnalyticsSource("related")).toBe(true);
    expect(isAnalyticsSource("external")).toBe(false);
  });

  it("accepts canonical post slugs", () => {
    expect(isValidPostSlug("nextjs-routing-matching")).toBe(true);
    expect(isValidPostSlug("../admin")).toBe(false);
    expect(isValidPostSlug(42)).toBe(false);
  });

  it("rotates visitor hashes by day", async () => {
    const first = await hashDailyVisitor("visitor-1", "2026-08-20");
    const same = await hashDailyVisitor("visitor-1", "2026-08-20");
    const nextDay = await hashDailyVisitor("visitor-1", "2026-08-21");

    expect(first).toBe(same);
    expect(first).not.toBe(nextDay);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
