import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// pages.dev 기본 도메인은 정규 도메인으로 301 보내 검색 인덱싱과 유입 분산을 막는다.
// Preview에서는 운영 DB·R2·Vectorize를 변경하지 못하게 한다.
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "")
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

  if (host === "sw-blog.pages.dev") {
    const url = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      "https://www.seung-woo.me",
    );
    return NextResponse.redirect(url, 301);
  }

  if (host.endsWith(".pages.dev") || host.endsWith(".workers.dev")) {
    const response = request.nextUrl.pathname.startsWith("/api/") &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method)
      ? NextResponse.json({ error: "Preview is read-only" }, { status: 403 })
      : NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
