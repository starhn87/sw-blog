// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackAnalyticsEvent } from "./analytics";

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

describe("reader analytics tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tracks each event once per day and session", () => {
    const event = { event: "post_view", slug: "post-slug" } as const;

    trackAnalyticsEvent(event);
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({ body: JSON.stringify(event) }),
    );
  });

  it.each([400, 403, 500])("allows another attempt after HTTP %s", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    const event = { event: "post_click", slug: "post-slug", source: "home" } as const;

    trackAnalyticsEvent(event);
    await vi.waitFor(() => expect(sessionStorage.length).toBe(0));
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("allows another attempt after a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const event = { event: "post_view", slug: "post-slug" } as const;

    trackAnalyticsEvent(event);
    await vi.waitFor(() => expect(sessionStorage.length).toBe(0));
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps successful events deduplicated after the response", async () => {
    const event = { event: "post_view", slug: "post-slug" } as const;

    trackAnalyticsEvent(event);
    await Promise.resolve();
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.length).toBe(1);
  });

  it("tracks again after the UTC day changes in the same session", () => {
    vi.useFakeTimers();
    const event = { event: "post_view", slug: "post-slug" } as const;
    vi.setSystemTime(new Date("2026-10-03T23:59:00Z"));
    trackAnalyticsEvent(event);
    trackAnalyticsEvent(event);

    vi.setSystemTime(new Date("2026-10-04T00:01:00Z"));
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["is-admin", "analytics-opt-out"])(
    "does not track when %s is enabled",
    (key) => {
      localStorage.setItem(key, "true");

      trackAnalyticsEvent({ event: "post_view", slug: "post-slug" });

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("does not track a browser that identifies itself as automated", () => {
    vi.stubGlobal("navigator", { webdriver: true });

    trackAnalyticsEvent({ event: "post_view", slug: "post-slug" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
