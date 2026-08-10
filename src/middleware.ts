import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// pages.dev 기본 도메인은 정규 도메인으로 301 보내 검색 인덱싱과 유입 분산을 막는다.
// 해시 프리뷰(*.sw-blog.pages.dev)는 배포 확인용으로 접속은 유지하되 noindex를 단다.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host === "sw-blog.pages.dev") {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      "https://www.seung-woo.me",
    );
    return NextResponse.redirect(url, 301);
  }

  if (host.endsWith(".pages.dev")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
