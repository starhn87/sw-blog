export const NEXT_VARIANT_HEADERS: readonly string[] = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-url",
];

export function isMissingStaticPage(
  request: Request,
  url: URL,
  routes: object,
  nextRoutes: readonly RegExp[],
): boolean {
  // Only unreserved ASCII is equivalent for matching. Reserved separators and
  // invalid encodings must keep their original Next.js semantics.
  const matchingPath = url.pathname.includes("%")
    ? url.pathname.replace(
      /%([0-9a-f]{2})/gi,
      (encoded: string, hex: string) => {
        const character = String.fromCharCode(Number.parseInt(hex, 16));
        return /^[a-zA-Z0-9._~-]$/.test(character) ? character : encoded;
      },
    )
    : url.pathname;

  return (
    !Object.hasOwn(routes, url.pathname) &&
    !Object.hasOwn(routes, matchingPath) &&
    /^\/[a-zA-Z0-9._~/-]+$/.test(matchingPath) &&
    !/\/\/|\/$|\.rsc$/.test(matchingPath) &&
    !/^\/(?:_next|cdn-cgi)(?:\/|$)/.test(matchingPath) &&
    !request.headers.has("x-nextjs-data") &&
    !url.searchParams.has("__nextDataReq") &&
    !nextRoutes.some(
      (pattern) =>
        pattern.test(url.pathname) ||
        (matchingPath !== url.pathname && pattern.test(matchingPath)),
    )
  );
}

export function isPublicStatsRequest(request: Request, url: URL): boolean {
  return request.method === "GET" && (
    (url.pathname === "/api/views" && ["", "?days=7"].includes(url.search)) ||
    (["/api/likes", "/api/comments"].includes(url.pathname) && url.search === "")
  );
}

export function shouldBypassStatsCache(
  request: Request,
  cookies: string,
): boolean {
  return [
    ...NEXT_VARIANT_HEADERS,
    "authorization",
    "x-admin-password",
    "range",
    "next-action",
    "x-prerender-revalidate",
  ].some((header) => request.headers.has(header)) ||
    /\b(?:no-cache|no-store|max-age\s*=\s*0)\b/i.test(
      `${request.headers.get("cache-control") ?? ""},${request.headers.get("pragma") ?? ""}`,
    ) ||
    cookies.includes("__prerender_bypass") ||
    cookies.includes("__next_preview_data");
}
