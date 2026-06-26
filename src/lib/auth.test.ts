import { describe, it, expect } from "vitest";
import { hashPassword, getOrCreateVisitorId } from "@/lib/auth";

describe("hashPassword", () => {
  it("returns a 64-char hex SHA-256 hash", async () => {
    expect(await hashPassword("secret")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", async () => {
    expect(await hashPassword("hello")).toBe(await hashPassword("hello"));
  });

  it("differs for different inputs", async () => {
    expect(await hashPassword("a")).not.toBe(await hashPassword("b"));
  });
});

describe("getOrCreateVisitorId", () => {
  it("reuses an existing visitor cookie without setting a new one", () => {
    const req = new Request("https://x.test", {
      headers: { cookie: "visitor_id=abc-123" },
    });
    const { id, setCookieHeader } = getOrCreateVisitorId(req);
    expect(id).toBe("abc-123");
    expect(setCookieHeader).toBeNull();
  });

  it("creates a new id with an HttpOnly Set-Cookie when none exists", () => {
    const { id, setCookieHeader } = getOrCreateVisitorId(
      new Request("https://x.test"),
    );
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(setCookieHeader).toContain("visitor_id=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("Secure");
  });

  it("omits Secure over http", () => {
    const { setCookieHeader } = getOrCreateVisitorId(
      new Request("http://x.test"),
    );
    expect(setCookieHeader).not.toContain("Secure");
  });
});
