// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackAnalyticsEvent } from "./analytics";

const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

describe("reader analytics tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("tracks each event once per session", () => {
    const event = { event: "post_view", slug: "post-slug" } as const;

    trackAnalyticsEvent(event);
    trackAnalyticsEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({ body: JSON.stringify(event) }),
    );
  });

  it.each(["is-admin", "analytics-opt-out"])(
    "does not track when %s is enabled",
    (key) => {
      localStorage.setItem(key, "true");

      trackAnalyticsEvent({ event: "post_view", slug: "post-slug" });

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
