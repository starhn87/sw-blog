// Cloudflare Web Analytics(RUM) 주간 리포트 생성기.
// 최근 7일은 GraphQL Analytics API에서 조회하고, 지난주는 전주 확정 snapshot과 비교한다.
// GitHub Actions(weekly-analytics.yml)가 매주 실행해 이슈로 등록한다.
//
// 필요 env:
//   CLOUDFLARE_API_TOKEN  - Account Analytics:Read 권한 포함 토큰
//   CLOUDFLARE_ACCOUNT_ID - 계정 ID
//   CF_SITE_TAG           - Web Analytics siteTag (공개값, 비콘 token과는 다른 식별자)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  coverageForRange,
  percentagePointChange,
  ratePercent,
} from "./weekly-analytics-metrics.mjs";

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
        sum { visits }
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
    if (
      !Array.isArray(data.events) ||
      !Array.isArray(data.sources) ||
      !Array.isArray(data.sourceVisitors) ||
      !Array.isArray(data.engagedPosts) ||
      !data.postReaders ||
      !Array.isArray(data.postReaders.posts) ||
      !data.coverage?.events ||
      !data.coverage?.postViews
    ) {
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
      (snapshot.version !== 1 && snapshot.version !== 2) ||
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
      countries: snapshot.countries ?? [],
      sampleInterval: snapshot.sampleInterval ?? null,
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
const sourceVisitorCount = (analytics, event, sources) =>
  analytics?.sourceVisitors
    .filter((row) => row.event === event && sources.includes(row.source))
    .reduce((sum, row) => sum + row.count, 0) ?? 0;
const coverage = (analytics, event, start, end) => {
  const startedAt = analytics?.coverage?.events?.[event];
  return startedAt
    ? coverageForRange(dateLabel(start), dateLabel(end), startedAt)
    : { covered: 0, total: 7, complete: false };
};
const postViewCoverage = (analytics, start, end) => {
  const startedAt = analytics?.coverage?.postViews;
  return startedAt
    ? coverageForRange(dateLabel(start), dateLabel(end), startedAt)
    : { covered: 0, total: 7, complete: false };
};
const coverageLabel = (value) => `${value.covered}/${value.total}일`;
const formatRate = (value) => (value === null ? "-" : `${value.toFixed(1)}%`);
const formatPointChange = (current, previous, comparable) => {
  if (!comparable) return "비교 불가";
  const change = percentagePointChange(current, previous);
  if (change === null) return "-";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "―";
  return `${arrow} ${Math.abs(change).toFixed(1)}%p`;
};
const referralComposition = (rows) =>
  rows.reduce(
    (result, row) => {
      const host = row.dimensions.refererHost;
      if (!host) result.direct += row.count;
      else if (SELF_REFERRERS.has(host)) result.internal += row.count;
      else result.external += row.count;
      return result;
    },
    { direct: 0, internal: 0, external: 0 },
  );

const storedPrev = loadPreviousSnapshot();
const [cur, readerAnalytics, previousReaderAnalytics, queriedPrev] =
  await Promise.all([
    fetchPeriod(thisStart, thisEnd),
    fetchReaderAnalytics(thisStart, thisEnd),
    fetchReaderAnalytics(prevStart, prevEnd),
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
const referrers = referralComposition(cur.topReferers);
const referrerTotal = referrers.direct + referrers.internal + referrers.external;
lines.push("| 구분 | 페이지뷰 | 비중 |");
lines.push("| --- | ---: | ---: |");
for (const [label, value] of [
  ["직접 유입", referrers.direct],
  ["내부 이동/self-referral", referrers.internal],
  ["외부 유입", referrers.external],
]) {
  lines.push(
    `| ${label} | ${value} | ${formatRate(ratePercent(value, referrerTotal))} |`,
  );
}
lines.push("");
lines.push("### 세부 유입처");
lines.push("");
lines.push("| 출처 | 페이지뷰 |");
lines.push("| --- | ---: |");
for (const row of cur.topReferers) {
  const host = row.dimensions.refererHost;
  if (host && SELF_REFERRERS.has(host)) continue;
  const isNew = host && !prevRefs.has(host);
  lines.push(`| ${refName(host)}${isNew ? " 🆕" : ""} | ${row.count} |`);
}
lines.push("");
lines.push("## 국가");
lines.push("");
lines.push("| 국가 | 페이지뷰 | 전체 비중 | 방문 (visits) |");
lines.push("| --- | ---: | ---: | ---: |");
for (const row of cur.countries) {
  lines.push(
    `| ${row.dimensions.countryName || "(미상)"} | ${row.count} | ${formatRate(ratePercent(row.count, curTotal.count))} | ${row.sum?.visits ?? "-"} |`,
  );
}
const topCountry = cur.countries[0];
const topCountryShare = topCountry
  ? ratePercent(topCountry.count, curTotal.count)
  : null;
if (topCountryShare !== null && topCountryShare >= 80) {
  lines.push("");
  lines.push(
    `> ⚠️ ${topCountry.dimensions.countryName || "(미상)"} 트래픽이 전체 페이지뷰의 ${topCountryShare.toFixed(1)}%예요. 콘텐츠 성과로 해석하기 전에 자동화 트래픽이나 특정 유입 집중 여부를 함께 확인하세요.`,
  );
}

if (readerAnalytics) {
  const readerMetrics = [
    {
      label: "목록 화면 방문",
      event: "listing_view",
      current: eventCount(readerAnalytics, "listing_view"),
      previous: eventCount(previousReaderAnalytics, "listing_view"),
    },
    {
      label: "목록에서 글 클릭",
      event: "post_click",
      current: sourceCount(readerAnalytics, "post_click", [
        "home",
        "blog",
        "tag",
      ]),
      previous: sourceCount(previousReaderAnalytics, "post_click", [
        "home",
        "blog",
        "tag",
      ]),
    },
    {
      label: "30초 또는 50% 이상 읽은 글",
      event: "engaged_read",
      current: eventCount(readerAnalytics, "engaged_read"),
      previous: eventCount(previousReaderAnalytics, "engaged_read"),
    },
    {
      label: "관련 글·시리즈 이동",
      event: "post_click",
      current: sourceCount(readerAnalytics, "post_click", [
        "related",
        "series",
      ]),
      previous: sourceCount(previousReaderAnalytics, "post_click", [
        "related",
        "series",
      ]),
    },
    {
      label: "검색 사용",
      event: "search_used",
      current: eventCount(readerAnalytics, "search_used"),
      previous: eventCount(previousReaderAnalytics, "search_used"),
    },
    {
      label: "검색 결과 없음",
      event: "search_no_results",
      current: eventCount(readerAnalytics, "search_no_results"),
      previous: eventCount(previousReaderAnalytics, "search_no_results"),
    },
    {
      label: "검색 결과 클릭",
      event: "post_click",
      current: sourceCount(readerAnalytics, "post_click", ["search"]),
      previous: sourceCount(previousReaderAnalytics, "post_click", ["search"]),
    },
  ];

  lines.push("");
  lines.push("## 독자 참여");
  lines.push("");
  lines.push("| 지표 | 이번 주 | 지난주 | 변화 | 수집 완결성 |");
  lines.push("| --- | ---: | ---: | :--- | :--- |");
  for (const metric of readerMetrics) {
    const currentCoverage = coverage(
      readerAnalytics,
      metric.event,
      thisStart,
      thisEnd,
    );
    const previousCoverage = coverage(
      readerAnalytics,
      metric.event,
      prevStart,
      prevEnd,
    );
    const comparable =
      Boolean(previousReaderAnalytics) &&
      currentCoverage.complete &&
      previousCoverage.complete;
    const previousLabel = previousReaderAnalytics ? metric.previous : "-";
    const change = comparable
      ? pct(metric.current, metric.previous)
      : "비교 불가";
    lines.push(
      `| ${metric.label} | ${metric.current} | ${previousLabel} | ${change} | 이번 ${coverageLabel(currentCoverage)} · 지난 ${coverageLabel(previousCoverage)} |`,
    );
  }

  const currentListingCoverage = coverage(
    readerAnalytics,
    "listing_view",
    thisStart,
    thisEnd,
  );
  const previousListingCoverage = coverage(
    readerAnalytics,
    "listing_view",
    prevStart,
    prevEnd,
  );
  const currentClickCoverage = coverage(
    readerAnalytics,
    "post_click",
    thisStart,
    thisEnd,
  );
  const previousClickCoverage = coverage(
    readerAnalytics,
    "post_click",
    prevStart,
    prevEnd,
  );
  const listingFunnelComparable =
    Boolean(previousReaderAnalytics) &&
    currentListingCoverage.complete &&
    previousListingCoverage.complete &&
    currentClickCoverage.complete &&
    previousClickCoverage.complete;

  lines.push("");
  lines.push("### 목록에서 글까지");
  lines.push("");
  lines.push("| 목록 | 이번 주 방문자일 → 클릭자일 | 지난주 | 클릭률 변화 |");
  lines.push("| --- | ---: | ---: | :--- |");
  for (const [source, label] of [
    ["home", "홈"],
    ["blog", "글 목록"],
    ["tag", "태그"],
  ]) {
    const currentViews = sourceVisitorCount(readerAnalytics, "listing_view", [
      source,
    ]);
    const currentClicks = sourceVisitorCount(readerAnalytics, "post_click", [
      source,
    ]);
    const previousViews = sourceVisitorCount(
      previousReaderAnalytics,
      "listing_view",
      [source],
    );
    const previousClicks = sourceVisitorCount(
      previousReaderAnalytics,
      "post_click",
      [source],
    );
    const currentRate = ratePercent(currentClicks, currentViews);
    const previousRate = ratePercent(previousClicks, previousViews);
    lines.push(
      `| ${label} | ${currentViews} → ${currentClicks} (${formatRate(currentRate)}) | ${previousViews} → ${previousClicks} (${formatRate(previousRate)}) | ${formatPointChange(currentRate, previousRate, listingFunnelComparable)} |`,
    );
  }

  const currentRecommendationCoverage = coverage(
    readerAnalytics,
    "recommendation_view",
    thisStart,
    thisEnd,
  );
  const previousRecommendationCoverage = coverage(
    readerAnalytics,
    "recommendation_view",
    prevStart,
    prevEnd,
  );
  const recommendationFunnelComparable =
    Boolean(previousReaderAnalytics) &&
    currentRecommendationCoverage.complete &&
    previousRecommendationCoverage.complete &&
    currentClickCoverage.complete &&
    previousClickCoverage.complete;

  lines.push("");
  lines.push("### 추천 영역에서 다음 글까지");
  lines.push("");
  lines.push("| 추천 영역 | 이번 주 노출자일 → 클릭자일 | 지난주 | 클릭률 변화 |");
  lines.push("| --- | ---: | ---: | :--- |");
  for (const [source, label] of [
    ["related", "관련 글"],
    ["series", "시리즈"],
  ]) {
    const currentViews = sourceVisitorCount(
      readerAnalytics,
      "recommendation_view",
      [source],
    );
    const currentClicks = sourceVisitorCount(readerAnalytics, "post_click", [
      source,
    ]);
    const previousViews = sourceVisitorCount(
      previousReaderAnalytics,
      "recommendation_view",
      [source],
    );
    const previousClicks = sourceVisitorCount(
      previousReaderAnalytics,
      "post_click",
      [source],
    );
    const currentRate = ratePercent(currentClicks, currentViews);
    const previousRate = ratePercent(previousClicks, previousViews);
    lines.push(
      `| ${label} | ${currentViews} → ${currentClicks} (${formatRate(currentRate)}) | ${previousViews} → ${previousClicks} (${formatRate(previousRate)}) | ${formatPointChange(currentRate, previousRate, recommendationFunnelComparable)} |`,
    );
  }
  lines.push("");
  lines.push(
    `_추천 영역 노출 수집: 이번 ${coverageLabel(currentRecommendationCoverage)} · 지난 ${coverageLabel(previousRecommendationCoverage)}_`,
  );

  const currentPostCoverage = postViewCoverage(
    readerAnalytics,
    thisStart,
    thisEnd,
  );
  const previousPostCoverage = postViewCoverage(
    readerAnalytics,
    prevStart,
    prevEnd,
  );
  const currentEngagementCoverage = coverage(
    readerAnalytics,
    "engaged_read",
    thisStart,
    thisEnd,
  );
  const previousEngagementCoverage = coverage(
    readerAnalytics,
    "engaged_read",
    prevStart,
    prevEnd,
  );
  const currentPostReaders = readerAnalytics.postReaders.total;
  const previousPostReaders = previousReaderAnalytics?.postReaders.total ?? 0;
  const currentEngaged = eventCount(readerAnalytics, "engaged_read");
  const previousEngaged = eventCount(previousReaderAnalytics, "engaged_read");
  const currentEngagementRate = ratePercent(currentEngaged, currentPostReaders);
  const previousEngagementRate = ratePercent(
    previousEngaged,
    previousPostReaders,
  );
  const engagementComparable =
    Boolean(previousReaderAnalytics) &&
    currentPostCoverage.complete &&
    previousPostCoverage.complete &&
    currentEngagementCoverage.complete &&
    previousEngagementCoverage.complete;

  lines.push("");
  lines.push("### 읽기 깊이");
  lines.push("");
  lines.push("| 지표 | 이번 주 | 지난주 | 변화 |");
  lines.push("| --- | ---: | ---: | :--- |");
  lines.push(
    `| 글 방문자일 중 충분히 읽은 비율 | ${currentEngaged}/${currentPostReaders} (${formatRate(currentEngagementRate)}) | ${previousEngaged}/${previousPostReaders} (${formatRate(previousEngagementRate)}) | ${formatPointChange(currentEngagementRate, previousEngagementRate, engagementComparable)} |`,
  );

  const engagedBySlug = new Map(
    readerAnalytics.engagedPosts.map((row) => [row.slug, row.count]),
  );
  lines.push("");
  lines.push("#### 글별 읽기 깊이");
  lines.push("");
  lines.push("| 글 | 방문자일 | 충분히 읽은 방문자일 | 비율 |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const post of readerAnalytics.postReaders.posts.slice(0, 10)) {
    const engaged = engagedBySlug.get(post.slug) ?? 0;
    lines.push(
      `| <code>${post.slug}</code> | ${post.count} | ${engaged} | ${formatRate(ratePercent(engaged, post.count))} |`,
    );
  }
  lines.push("");
  lines.push(
    "_방문자일은 같은 날의 익명 방문자를 한 번만 세는 단위예요. 표본이 작은 글의 비율은 방향을 찾는 단서로만 보고, 검색어·IP·User-Agent는 저장하지 않아요._",
  );
}

const snapshot = {
  version: 2,
  siteTag: SITE_TAG,
  start: dateLabel(thisStart),
  endExclusive: dateLabel(thisEnd),
  total: curTotal,
  topPaths: cur.topPaths,
  topReferers: cur.topReferers,
  countries: cur.countries,
  sampleInterval: curSampleInterval,
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
          "Cloudflare 트래픽과 D1 독자 참여는 수집 방식과 단위가 다르므로 서로 나눠 비율을 만들지 말고, 리포트에 계산된 비율만 해석해요. " +
          "'비교 불가'인 항목은 증가·감소로 해석하지 않아요. 국가 편중이나 자동화 트래픽은 가능성으로만 다뤄요. " +
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
  "_트래픽은 Cloudflare Web Analytics, 독자 참여는 D1 기준이에요. 두 시스템의 수치는 직접 나눠 비율로 쓰지 않아요. 🆕 = 지난주 상위권에 없던 유입처_",
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
