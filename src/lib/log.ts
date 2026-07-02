// 서버(edge) 런타임의 에러를 구조화된 JSON 한 줄로 남긴다.
// Cloudflare 대시보드의 Real-time Logs에서 `at`(경로)·`message`로 검색·추적할 수 있다.
// next-on-pages에서 Sentry가 불안정해, 경량 대안으로 둔다.
export function logError(
  at: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  console.error(
    JSON.stringify({
      at,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }),
  );
}
