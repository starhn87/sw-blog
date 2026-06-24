import { describe, it, expect } from "vitest";
import {
  getOptimizedImageUrl,
  getImageSrcSet,
  canOptimize,
  getZoomImageUrl,
} from "./image";

describe("getOptimizedImageUrl", () => {
  it("optimizable 이미지를 cdn-cgi URL로 변환한다", () => {
    const url = getOptimizedImageUrl("/api/media?key=abc.png", 800);
    expect(url).toContain("/cdn-cgi/image/");
    expect(url).toContain("width=800");
    expect(url).toContain("format=avif");
  });

  it("외부 URL은 그대로 둔다", () => {
    expect(getOptimizedImageUrl("https://other.com/x.png", 800)).toBe(
      "https://other.com/x.png",
    );
  });
});

describe("canOptimize", () => {
  it("gif는 최적화 대상이 아니다", () => {
    expect(canOptimize("/api/media?key=x.gif")).toBe(false);
  });

  it("이미 변환된 cdn-cgi URL은 다시 최적화하지 않는다", () => {
    expect(canOptimize("/cdn-cgi/image/width=800/foo.png")).toBe(false);
  });
});

describe("getImageSrcSet / getZoomImageUrl", () => {
  it("srcset은 작은 변형과 큰 변형을 모두 포함한다", () => {
    const srcset = getImageSrcSet("/api/media?key=abc.png");
    expect(srcset).toContain("400w");
    expect(srcset).toContain("2000w");
  });

  it("zoom URL은 가장 큰 변형과 같은 파라미터를 공유한다", () => {
    expect(getZoomImageUrl("/api/media?key=abc.png")).toBe(
      getOptimizedImageUrl("/api/media?key=abc.png", 2000),
    );
  });
});
