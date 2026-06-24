import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("클래스를 병합한다", () => {
    expect(cn("p-4", "text-sm")).toBe("p-4 text-sm");
  });

  it("tailwind 충돌은 뒤 클래스가 이긴다", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("falsy 값은 무시한다", () => {
    expect(cn("p-4", false, null, undefined, "text-sm")).toBe("p-4 text-sm");
  });
});
