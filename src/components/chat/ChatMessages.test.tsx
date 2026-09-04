// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessages } from "./ChatMessages";

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

describe("ChatMessages", () => {
  it("gives the source section and links enough breathing room", () => {
    render(<ChatMessages
      messages={[{
        role: "assistant",
        content: "답변",
        sources: [{ slug: "postgis-location-search", title: "PostGIS로 위치 검색하기" }],
      }]}
      loading={false}
      onAsk={() => {}}
    />);

    const heading = screen.getByText("참고한 글");
    expect(heading.parentElement?.className).toContain("mt-4");
    expect(heading.parentElement?.className).toContain("pt-3");
    expect(screen.getByRole("link").className).toContain("px-2.5");
    expect(screen.getByRole("link").className).toContain("py-1");
  });
});
