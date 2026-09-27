import type { ContextAssessment } from "./chatContextDecision";

// 요청 본문·방문자 식별자·IP·공급자 request ID는 통계에 저장하지 않는다.
export async function recordChatObservation(db: D1Database, mode: string, result: ContextAssessment, now = new Date()) {
  await db.prepare(`INSERT INTO jev_shadow_events
    (observed_at, mode, definition_id, definition_version, requested_model, resolved_model,
     outcome, duration_ms, input_tokens, output_tokens, about_choice, code_choice, posts_choice)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    now.toISOString(), mode, result.meta.definitionId, result.meta.definitionVersion,
    result.meta.requestedModel, result.meta.model, result.ok ? "ok" : result.error.kind,
    result.meta.durationMs, result.meta.inputTokens, result.meta.outputTokens,
    result.ok ? result.answers.about.choice : null,
    result.ok ? result.answers.code.choice : null,
    result.ok ? result.answers.posts.choice : null,
  ).run();
}

export async function collectChatObservations(db: D1Database, start: string, end: string) {
  const inRange = "observed_at >= ? AND observed_at < ?";
  const [totals, latency, groups, choices] = await db.batch<Record<string, number | string | null>>([
    db.prepare(`SELECT COUNT(*) AS observations,
      SUM(CASE WHEN outcome = 'ok' THEN 1 ELSE 0 END) AS succeeded,
      SUM(CASE WHEN outcome != 'ok' THEN 1 ELSE 0 END) AS failed,
      SUM(input_tokens) AS inputTokens, SUM(output_tokens) AS outputTokens,
      SUM(CASE WHEN input_tokens IS NULL THEN 1 ELSE 0 END) AS unknownInputTokens,
      SUM(CASE WHEN output_tokens IS NULL THEN 1 ELSE 0 END) AS unknownOutputTokens
      FROM jev_shadow_events WHERE ${inRange}`).bind(start, end),
    db.prepare(`WITH ordered AS (
      SELECT duration_ms, ROW_NUMBER() OVER (ORDER BY duration_ms) AS rank,
        COUNT(*) OVER () AS total FROM jev_shadow_events WHERE ${inRange}
    ) SELECT MIN(CASE WHEN rank >= total * 0.5 THEN duration_ms END) AS p50Ms,
      MIN(CASE WHEN rank >= total * 0.95 THEN duration_ms END) AS p95Ms FROM ordered`).bind(start, end),
    db.prepare(`SELECT mode, definition_id AS definitionId, definition_version AS definitionVersion,
      requested_model AS requestedModel, resolved_model AS model, outcome, COUNT(*) AS observations
      FROM jev_shadow_events WHERE ${inRange}
      GROUP BY mode, definition_id, definition_version, requested_model, resolved_model, outcome`).bind(start, end),
    db.prepare(`SELECT about_choice AS about, code_choice AS code, posts_choice AS posts, COUNT(*) AS observations
      FROM jev_shadow_events WHERE ${inRange} AND outcome = 'ok'
      GROUP BY about_choice, code_choice, posts_choice`).bind(start, end),
  ]);
  return { version: 1, start, end, totals: { ...totals.results[0], ...latency.results[0] },
    groups: groups.results, choices: choices.results, qualityReviewedCases: 0 };
}
