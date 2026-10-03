// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { OutboundClickTracker } from "./OutboundClickTracker";

vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/analytics")>(),
  trackAnalyticsEvent: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function Post({ slug = "motomap", href = "https://motomap.kr" }) {
  return (
    <article>
      <OutboundClickTracker slug={slug} />
      <div className="prose">
        <a href={href} target="_blank" rel="noopener noreferrer"><span>둘러보기</span></a>
      </div>
    </article>
  );
}

describe("outbound reader clicks", () => {
  it.each([
    ["https://motomap.kr", "motomap"],
    ["https://apps.apple.com/app/id6773636183", "app_store"],
  ])("tracks the allowlisted destination %s without changing the link", (href, source) => {
    render(<Post href={href} />);
    const link = screen.getByRole("link");

    expect(fireEvent.click(screen.getByText("둘러보기"))).toBe(true);

    expect(trackAnalyticsEvent).toHaveBeenCalledExactlyOnceWith({ event: "outbound_click", slug: "motomap", source });
    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("tracks a middle click but not a right click", () => {
    render(<Post />);
    const link = screen.getByRole("link");
    fireEvent(link, new MouseEvent("auxclick", { button: 2, bubbles: true }));
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();

    fireEvent(link, new MouseEvent("auxclick", { button: 1, bubbles: true }));
    expect(trackAnalyticsEvent).toHaveBeenCalledExactlyOnceWith({ event: "outbound_click", slug: "motomap", source: "motomap" });
  });

  it.each([
    "https://example.com",
    "https://motomap.kr/?private=value",
    "http://motomap.kr/",
    "/blog/motomap",
  ])("does not collect arbitrary URLs or query strings (%s)", (href) => {
    render(<Post href={href} />);
    fireEvent.click(screen.getByRole("link"));
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("ignores links outside the article body and cancelled navigation", () => {
    render(<><Post /><a href="https://motomap.kr" target="_blank">헤더 링크</a></>);
    fireEvent.click(screen.getByText("헤더 링크"));
    const link = screen.getByRole("link", { name: "둘러보기" });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("updates the post slug on navigation and removes listeners on unmount", () => {
    const view = render(<Post />);
    view.rerender(<Post slug="postgis-location-search" />);
    fireEvent.click(screen.getByRole("link"));
    expect(trackAnalyticsEvent).toHaveBeenCalledExactlyOnceWith({ event: "outbound_click", slug: "postgis-location-search", source: "motomap" });

    view.unmount();
    vi.mocked(trackAnalyticsEvent).mockClear();
    const article = document.createElement("article");
    article.innerHTML = '<div class="prose"><a href="https://motomap.kr" target="_blank">링크</a></div>';
    document.body.appendChild(article);
    fireEvent.click(article.querySelector("a")!);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
    article.remove();
  });
});
