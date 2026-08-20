// Cloudflare Web Analytics(RUM) 주간 리포트 생성기.
// 최근 7일은 GraphQL Analytics API에서 조회하고, 지난주는 전주 확정 snapshot과 비교한다.
// GitHub Actions(weekly-analytics.yml)가 매주 실행해 이슈로 등록한다.
//
// 필요 env:
//   CLOUDFLARE_API_TOKEN  - Account Analytics:Read 권한 포함 토큰
//   CLOUDFLARE_ACCOUNT_ID - 계정 ID
//   CF_SITE_TAG           - Web Analytics site tag (비콘 token 값, 공개값)

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const SITE_TAG = process.env.CF_SITE_TAG;
const ANALYTICS_ORIGIN =
  process.env.ANALYTICS_ORIGIN ?? "https://www.seung-woo.me";

if (!TOKEN || !ACCOUNT || !SITE_TAG) {
  console.error(
    "CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CF_SITE_TAG env가 필요합니다.",
  );
  process.exit(1);
}

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const iso = (d) => d.toISOString();
const dateLabel = (d) => iso(d).slice(0, 10);
console.error(`사용할 siteTag: ${SITE_TAG}`);

// 이번 주 = 최근 7일(오늘 제외), 지난주 = 그 전 7일
const thisEnd = day(0);
const thisStart = day(-7);
const prevEnd = thisStart;
const prevStart = day(-14);

const queryWithSampling = (includeSampling) => `
query ($accountTag: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      total: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1) {
        count
        sum { visits }
        ${includeSampling ? "avg { sampleInterval }" : ""}
      }
      topPaths: rumPageloadEventsAdaptiveGroups(
        filter: $filter, limit: 50, orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      topReferers: rumPageloadEventsAdaptiveGroups(
        filter: $filter, limit: 50, orderBy: [count_DESC]
      ) {
        count
        dimensions { refererHost }
      }
      countries: rumPageloadEventsAdaptiveGroups(
        filter: $filter, limit: 5, orderBy: [count_DESC]
      ) {
        count
        dimensions { countryName }
      }
    }
  }
}`;

async function fetchPeriod(start, end, includeSampling = true) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: queryWithSampling(includeSampling),
      variables: {
        accountTag: ACCOUNT,
        filter: {
          AND: [
            { datetime_geq: iso(start), datetime_lt: iso(end) },
            { siteTag: SITE_TAG },
          ],
        },
      },
    }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join(" / ");
    if (includeSampling && /sampleInterval|Cannot query field ['\"]avg/i.test(msg)) {
      console.error(`sampleInterval 조회 미지원 - sampling 정보 없이 재시도: ${msg}`);
      return fetchPeriod(start, end, false);
    }
    if (/auth|permission|access/i.test(msg)) {
      console.error(
        `Cloudflare GraphQL 인증 실패: ${msg}\n` +
          "CLOUDFLARE_API_TOKEN에 'Account Analytics:Read' 권한이 있는지 확인하세요.",
      );
    } else {
      console.error(`Cloudflare GraphQL 오류: ${msg}`);
    }
    process.exit(1);
  }
  return json.data.viewer.accounts[0];
}

async function fetchReaderAnalytics(start, end) {
  const url = new URL("/api/analytics", ANALYTICS_ORIGIN);
  url.searchParams.set("start", dateLabel(start));
  url.searchParams.set("end", dateLabel(end));
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`독자 참여 집계 조회 실패: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data.events) || !Array.isArray(data.sources)) {
      console.error("독자 참여 집계 응답 형식이 올바르지 않습니다.");
      return null;
    }
    return data;
  } catch (error) {
    console.error(
      `독자 참여 집계 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

const SNAPSHOT_PREFIX = "<!-- analytics-snapshot:";
const PREVIOUS_REPORT_PATH = "previous-analytics-report.md";

function loadPreviousSnapshot() {
  if (!existsSync(PREVIOUS_REPORT_PATH)) return null;
  const report = readFileSync(PREVIOUS_REPORT_PATH, "utf8");
  const start = report.indexOf(SNAPSHOT_PREFIX);
  if (start === -1) return null;
  const end = report.indexOf(" -->", start);
  if (end === -1) return null;

  try {
    const snapshot = JSON.parse(
      report.slice(start + SNAPSHOT_PREFIX.length, end),
    );
    if (
      snapshot.version !== 1 ||
      snapshot.siteTag !== SITE_TAG ||
      snapshot.start !== dateLabel(prevStart) ||
      snapshot.endExclusive !== dateLabel(prevEnd)
    ) {
      console.error("이전 리포트 snapshot의 집계 기준이 달라 재조회합니다.");
      return null;
    }
    return {
      total: [snapshot.total],
      topPaths: snapshot.topPaths,
      topReferers: snapshot.topReferers,
      sampleInterval: snapshot.sampleInterval ?? null,
      readerAnalytics: snapshot.readerAnalytics ?? null,
    };
  } catch (error) {
    console.error(
      `이전 리포트 snapshot 파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

const pct = (cur, prev) => {
  if (!prev) return cur ? "신규" : "-";
  const p = ((cur - prev) / prev) * 100;
  const arrow = p > 0 ? "▲" : p < 0 ? "▼" : "―";
  return `${arrow} ${Math.abs(p).toFixed(0)}%`;
};
const refName = (host) => (host ? host : "(직접 유입)");
const SELF_REFERRERS = new Set([
  "seung-woo.me",
  "www.seung-woo.me",
  "sw-blog.pages.dev",
]);

const eventCount = (analytics, event) =>
  analytics?.events.find((row) => row.event === event)?.count ?? 0;
const sourceCount = (analytics, event, sources) =>
  analytics?.sources
    .filter((row) => row.event === event && sources.includes(row.source))
    .reduce((sum, row) => sum + row.count, 0) ?? 0;

const storedPrev = loadPreviousSnapshot();
const [cur, readerAnalytics, queriedPrev] = await Promise.all([
  fetchPeriod(thisStart, thisEnd),
  fetchReaderAnalytics(thisStart, thisEnd),
  storedPrev ? Promise.resolve(null) : fetchPeriod(prevStart, prevEnd),
]);
const prev = storedPrev ?? queriedPrev;
const comparisonSource = storedPrev ? "전주 확정 snapshot" : "Cloudflare 재조회";

const curTotal = cur.total[0] ?? { count: 0, sum: { visits: 0 } };
const prevTotal = prev.total[0] ?? { count: 0, sum: { visits: 0 } };
const curSampleInterval = curTotal.avg?.sampleInterval ?? null;
const prevSampleInterval =
  prev.sampleInterval ?? prevTotal.avg?.sampleInterval ?? null;

const prevPathCount = new Map(
  prev.topPaths.map((r) => [r.dimensions.requestPath, r.count]),
);
const prevRefs = new Set(prev.topReferers.map((r) => r.dimensions.refererHost));

const lines = [];
lines.push(`집계 기간: **${dateLabel(thisStart)} ~ ${dateLabel(day(-1))}** (지난주 대비)`);
lines.push("");
lines.push(
  `집계 기준: siteTag \`${SITE_TAG}\` · 비교 데이터: ${comparisonSource}`,
);
if (curSampleInterval || prevSampleInterval) {
  lines.push(
    `sampling interval: 이번 주 ${curSampleInterval ?? "확인 불가"} · 지난주 ${prevSampleInterval ?? "확인 불가"}`,
  );
}
lines.push("");
lines.push("## 요약");
lines.push("");
lines.push("| 지표 | 이번 주 | 지난주 | 변화 |");
lines.push("| --- | ---: | ---: | :--- |");
lines.push(
  `| 방문 (visits) | ${curTotal.sum.visits} | ${prevTotal.sum.visits} | ${pct(curTotal.sum.visits, prevTotal.sum.visits)} |`,
);
lines.push(
  `| 페이지뷰 | ${curTotal.count} | ${prevTotal.count} | ${pct(curTotal.count, prevTotal.count)} |`,
);
lines.push("");
lines.push("## 많이 본 페이지");
lines.push("");
lines.push("| 경로 | 페이지뷰 | 지난주 대비 |");
lines.push("| --- | ---: | :--- |");
for (const row of cur.topPaths.slice(0, 10)) {
  const path = row.dimensions.requestPath;
  lines.push(`| \`${path}\` | ${row.count} | ${pct(row.count, prevPathCount.get(path))} |`);
}
lines.push("");
lines.push("## 유입처");
lines.push("");
lines.push("| 출처 | 페이지뷰 |");
lines.push("| --- | ---: |");
let selfReferralCount = 0;
for (const row of cur.topReferers) {
  const host = row.dimensions.refererHost;
  if (host && SELF_REFERRERS.has(host)) {
    selfReferralCount += row.count;
    continue;
  }
  const isNew = host && !prevRefs.has(host);
  lines.push(`| ${refName(host)}${isNew ? " 🆕" : ""} | ${row.count} |`);
}
if (selfReferralCount > 0) {
  lines.push(`| (내부 이동/self-referral) | ${selfReferralCount} |`);
}
lines.push("");
lines.push("## 국가");
lines.push("");
lines.push(
  cur.countries
    .map((r) => `${r.dimensions.countryName || "(미상)"} ${r.count}`)
    .join(" · "),
);

if (readerAnalytics) {
  const previousReaderAnalytics = prev.readerAnalytics;
  const readerMetrics = [
    [
      "목록 화면 방문",
      eventCount(readerAnalytics, "listing_view"),
      eventCount(previousReaderAnalytics, "listing_view"),
    ],
    [
      "목록에서 글 클릭",
      sourceCount(readerAnalytics, "post_click", ["home", "blog", "tag"]),
      sourceCount(previousReaderAnalytics, "post_click", [
        "home",
        "blog",
        "tag",
      ]),
    ],
    [
      "30초 또는 50% 이상 읽은 글",
      eventCount(readerAnalytics, "engaged_read"),
      eventCount(previousReaderAnalytics, "engaged_read"),
    ],
    [
      "관련 글·시리즈 이동",
      sourceCount(readerAnalytics, "post_click", ["related", "series"]),
      sourceCount(previousReaderAnalytics, "post_click", [
        "related",
        "series",
      ]),
    ],
    [
      "검색 사용",
      eventCount(readerAnalytics, "search_used"),
      eventCount(previousReaderAnalytics, "search_used"),
    ],
    [
      "검색 결과 없음",
      eventCount(readerAnalytics, "search_no_results"),
      eventCount(previousReaderAnalytics, "search_no_results"),
    ],
    [
      "검색 결과 클릭",
      sourceCount(readerAnalytics, "post_click", ["search"]),
      sourceCount(previousReaderAnalytics, "post_click", ["search"]),
    ],
  ];

  lines.push("");
  lines.push("## 독자 참여");
  lines.push("");
  lines.push("| 지표 | 이번 주 | 지난주 | 변화 |");
  lines.push("| --- | ---: | ---: | :--- |");
  for (const [label, current, previous] of readerMetrics) {
    const previousLabel = previousReaderAnalytics ? previous : "-";
    const change = previousReaderAnalytics ? pct(current, previous) : "-";
    lines.push(`| ${label} | ${current} | ${previousLabel} | ${change} |`);
  }
  lines.push("");
  lines.push(
    "_D1의 날짜별 익명 중복 제거 기준이에요. 검색어, IP, User-Agent는 저장하지 않아요._",
  );
}

const snapshot = {
  version: 1,
  siteTag: SITE_TAG,
  start: dateLabel(thisStart),
  endExclusive: dateLabel(thisEnd),
  total: curTotal,
  topPaths: cur.topPaths,
  topReferers: cur.topReferers,
  sampleInterval: curSampleInterval,
  readerAnalytics,
};
// Claude 인사이트 코멘트 - 실패해도 리포트 발행은 막지 않는다
async function claudeComment(reportMd) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("ANTHROPIC_API_KEY 없음 - 코멘트 생략");
    return null;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 4096,
        fallbacks: "default",
        system:
          "개인 기술·여행 블로그(seung-woo.me)의 주간 방문 리포트를 읽고 블로그 주인에게 인사이트 코멘트를 남기는 분석가예요. " +
          "규칙: 리포트의 수치에 근거한 관찰 2~4개와 다음 주에 해볼 만한 실행 제안 1개를 불릿으로 써요. " +
          "각 불릿은 1~2문장, 해요체를 쓰고 과장이나 의미 없는 칭찬은 하지 않아요. " +
          "수치에 없는 원인은 단정하지 말고 '~일 수 있어요'로 표현해요. 불릿 목록만 출력하고 서두와 맺음말은 쓰지 않아요.",
        messages: [{ role: "user", content: reportMd }],
      }),
    });
    if (!res.ok) {
      console.error(`Claude API ${res.status} - 코멘트 생략: ${await res.text()}`);
      return null;
    }
    const json = await res.json();
    if (json.stop_reason === "refusal") {
      console.error("Claude가 응답을 거절 - 코멘트 생략");
      return null;
    }
    const text = json.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.error(`Claude 호출 실패 - 코멘트 생략: ${err.message}`);
    return null;
  }
}

lines.push("");
lines.push("---");
lines.push(
  "_트래픽은 Cloudflare Web Analytics, 독자 참여는 D1 기준이에요. 🆕 = 지난주 상위권에 없던 유입처_",
);

const visibleReport = lines.join("\n");
lines.push("");
lines.push(`${SNAPSHOT_PREFIX}${JSON.stringify(snapshot)} -->`);
const report = lines.join("\n");
writeFileSync("analytics-report.md", report);
console.log(report);

// 코멘트는 이슈 바디가 아니라 실제 이슈 코멘트로 단다 (워크플로가 파일 존재 시 gh issue comment)
const comment = await claudeComment(visibleReport);
if (comment) {
  writeFileSync(
    "claude-comment.md",
    `${comment}\n\n_이 코멘트는 Claude가 리포트를 읽고 자동 작성했어요._`,
  );
  console.log("\n[claude-comment.md 생성됨]");
}
console.log(`\n::notice::기간 ${dateLabel(thisStart)}~${dateLabel(day(-1))} 리포트 생성 완료`);
