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
  it("gives wrapped source links enough breathing room", () => {
    render(<ChatMessages
      messages={[{
        role: "assistant",
        content: "답변",
        sources: [{
          slug: "pyeongchang-gangneung-trip",
          title: "평창·강릉 여행 1: 누가 평창 가서 뭐해요? 할 때 보여주면 되는 글",
        }],
      }]}
      loading={false}
      onAsk={() => {}}
    />);

    const heading = screen.getByText("참고한 글");
    expect(heading.parentElement?.className).toContain("mt-4");
    expect(heading.parentElement?.className).toContain("pt-3");
    expect(screen.getByRole("link").className).toContain("rounded-2xl");
    expect(screen.getByRole("link").className).toContain("px-3");
    expect(screen.getByRole("link").className).toContain("py-2");
    expect(screen.getByRole("link").className).toContain("leading-5");
  });
});
