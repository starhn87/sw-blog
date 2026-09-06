import {
  coverageForRange,
  percentagePointChange,
  ratePercent,
} from "./weekly-analytics-metrics.mjs";

export const ANALYTICS_SNAPSHOT_PREFIX = "<!-- analytics-snapshot:";

const dateLabel = (date) => date.toISOString().slice(0, 10);
const pct = (current, previous) => {
  if (!previous) return current ? "신규" : "-";
  const percentage = ((current - previous) / previous) * 100;
  const arrow = percentage > 0 ? "▲" : percentage < 0 ? "▼" : "―";
  return `${arrow} ${Math.abs(percentage).toFixed(0)}%`;
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
const formatRate = (value) =>
  value === null ? "-" : `${value.toFixed(1)}%`;
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

export function buildWeeklyAnalyticsReport({
  siteTag,
  currentPeriod,
  previousPeriod,
  current,
  previous,
  readerAnalytics,
  previousReaderAnalytics,
  comparisonSource,
}) {
  const curTotal = current.total[0] ?? { count: 0, sum: { visits: 0 } };
  const prevTotal = previous.total[0] ?? { count: 0, sum: { visits: 0 } };
  const curSampleInterval = curTotal.avg?.sampleInterval ?? null;
  const prevSampleInterval =
    previous.sampleInterval ?? prevTotal.avg?.sampleInterval ?? null;

  const prevPathCount = new Map(
    previous.topPaths.map((row) => [row.dimensions.requestPath, row.count]),
  );
  const prevRefs = new Set(
    previous.topReferers.map((row) => row.dimensions.refererHost),
  );

  const lines = [];
  lines.push(
    `집계 기간: **${dateLabel(currentPeriod.start)} ~ ${dateLabel(currentPeriod.endInclusive)}** (지난주 대비)`,
  );
  lines.push("");
  lines.push(
    `집계 기준: siteTag \`${siteTag}\` · 비교 데이터: ${comparisonSource}`,
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
  for (const row of current.topPaths.slice(0, 10)) {
    const path = row.dimensions.requestPath;
    lines.push(
      `| \`${path}\` | ${row.count} | ${pct(row.count, prevPathCount.get(path))} |`,
    );
  }
  lines.push("");
  lines.push("## 유입처");
  lines.push("");
  const referrers = referralComposition(current.topReferers);
  const referrerTotal =
    referrers.direct + referrers.internal + referrers.external;
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
  for (const row of current.topReferers) {
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
  for (const row of current.countries) {
    lines.push(
      `| ${row.dimensions.countryName || "(미상)"} | ${row.count} | ${formatRate(ratePercent(row.count, curTotal.count))} | ${row.sum?.visits ?? "-"} |`,
    );
  }
  const topCountry = current.countries[0];
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
        previous: sourceCount(previousReaderAnalytics, "post_click", [
          "search",
        ]),
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
        currentPeriod.start,
        currentPeriod.endExclusive,
      );
      const previousCoverage = coverage(
        readerAnalytics,
        metric.event,
        previousPeriod.start,
        previousPeriod.endExclusive,
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
      currentPeriod.start,
      currentPeriod.endExclusive,
    );
    const previousListingCoverage = coverage(
      readerAnalytics,
      "listing_view",
      previousPeriod.start,
      previousPeriod.endExclusive,
    );
    const currentClickCoverage = coverage(
      readerAnalytics,
      "post_click",
      currentPeriod.start,
      currentPeriod.endExclusive,
    );
    const previousClickCoverage = coverage(
      readerAnalytics,
      "post_click",
      previousPeriod.start,
      previousPeriod.endExclusive,
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
      const currentViews = sourceVisitorCount(
        readerAnalytics,
        "listing_view",
        [source],
      );
      const currentClicks = sourceVisitorCount(
        readerAnalytics,
        "post_click",
        [source],
      );
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
      currentPeriod.start,
      currentPeriod.endExclusive,
    );
    const previousRecommendationCoverage = coverage(
      readerAnalytics,
      "recommendation_view",
      previousPeriod.start,
      previousPeriod.endExclusive,
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
    lines.push(
      "| 추천 영역 | 이번 주 노출자일 → 클릭자일 | 지난주 | 클릭률 변화 |",
    );
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
      const currentClicks = sourceVisitorCount(
        readerAnalytics,
        "post_click",
        [source],
      );
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
      currentPeriod.start,
      currentPeriod.endExclusive,
    );
    const previousPostCoverage = postViewCoverage(
      readerAnalytics,
      previousPeriod.start,
      previousPeriod.endExclusive,
    );
    const currentEngagementCoverage = coverage(
      readerAnalytics,
      "engaged_read",
      currentPeriod.start,
      currentPeriod.endExclusive,
    );
    const previousEngagementCoverage = coverage(
      readerAnalytics,
      "engaged_read",
      previousPeriod.start,
      previousPeriod.endExclusive,
    );
    const currentPostReaders = readerAnalytics.postReaders.total;
    const previousPostReaders = previousReaderAnalytics?.postReaders.total ?? 0;
    const currentEngaged = eventCount(readerAnalytics, "engaged_read");
    const previousEngaged = eventCount(
      previousReaderAnalytics,
      "engaged_read",
    );
    const currentEngagementRate = ratePercent(
      currentEngaged,
      currentPostReaders,
    );
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
    siteTag,
    start: dateLabel(currentPeriod.start),
    endExclusive: dateLabel(currentPeriod.endExclusive),
    total: curTotal,
    topPaths: current.topPaths,
    topReferers: current.topReferers,
    countries: current.countries,
    sampleInterval: curSampleInterval,
  };

  lines.push("");
  lines.push("---");
  lines.push(
    "_트래픽은 Cloudflare Web Analytics, 독자 참여는 D1 기준이에요. 두 시스템의 수치는 직접 나눠 비율로 쓰지 않아요. 🆕 = 지난주 상위권에 없던 유입처_",
  );

  const visibleReport = lines.join("\n");
  lines.push("");
  lines.push(
    `${ANALYTICS_SNAPSHOT_PREFIX}${JSON.stringify(snapshot)} -->`,
  );

  return {
    visibleReport,
    report: lines.join("\n"),
    snapshot,
  };
}
