import { describe, expect, it } from "vitest";
import {
  coverageForRange,
  percentagePointChange,
  ratePercent,
} from "../../scripts/weekly-analytics-metrics.mjs";
import { buildWeeklyAnalyticsReport } from "../../scripts/weekly-analytics-render.mjs";

const currentPeriod = {
  start: new Date("2026-08-24T00:00:00Z"),
  endExclusive: new Date("2026-08-31T00:00:00Z"),
  endInclusive: new Date("2026-08-30T00:00:00Z"),
};
const previousPeriod = {
  start: new Date("2026-08-17T00:00:00Z"),
  endExclusive: new Date("2026-08-24T00:00:00Z"),
};

const currentTraffic = {
  total: [{ count: 100, sum: { visits: 80 }, avg: { sampleInterval: 2 } }],
  topPaths: [
    { count: 60, dimensions: { requestPath: "/blog/example" } },
  ],
  topReferers: [
    { count: 30, dimensions: { refererHost: "" } },
    { count: 20, dimensions: { refererHost: "www.seung-woo.me" } },
    { count: 40, dimensions: { refererHost: "google.com" } },
    { count: 10, dimensions: { refererHost: "search.naver.com" } },
  ],
  countries: [
    { count: 90, sum: { visits: 70 }, dimensions: { countryName: "한국" } },
    { count: 10, sum: { visits: 10 }, dimensions: { countryName: "미국" } },
  ],
};

const previousTraffic = {
  total: [{ count: 80, sum: { visits: 70 }, avg: { sampleInterval: 1 } }],
  topPaths: [
    { count: 30, dimensions: { requestPath: "/blog/example" } },
  ],
  topReferers: [
    { count: 20, dimensions: { refererHost: "" } },
    { count: 10, dimensions: { refererHost: "www.seung-woo.me" } },
    { count: 50, dimensions: { refererHost: "google.com" } },
  ],
  countries: [
    { count: 70, sum: { visits: 60 }, dimensions: { countryName: "한국" } },
  ],
};

const completeCoverage = {
  events: {
    listing_view: "2026-08-01",
    post_view: "2026-08-01",
    post_click: "2026-08-01",
    recommendation_view: "2026-08-01",
    engaged_read: "2026-08-01",
    search_used: "2026-08-01",
    search_no_results: "2026-08-01",
  },
};

const currentReaders = {
  events: [
    { event: "listing_view", count: 40 },
    { event: "post_view", count: 20 },
    { event: "engaged_read", count: 10 },
    { event: "search_used", count: 3 },
    { event: "search_no_results", count: 1 },
  ],
  sources: [
    { event: "post_click", source: "home", count: 8 },
    { event: "post_click", source: "blog", count: 4 },
    { event: "post_click", source: "tag", count: 0 },
    { event: "post_click", source: "related", count: 2 },
    { event: "post_click", source: "series", count: 1 },
    { event: "post_click", source: "search", count: 2 },
  ],
  sourceVisitors: [
    { event: "listing_view", source: "home", count: 20 },
    { event: "listing_view", source: "blog", count: 10 },
    { event: "listing_view", source: "tag", count: 10 },
    { event: "post_click", source: "home", count: 8 },
    { event: "post_click", source: "blog", count: 4 },
    { event: "post_click", source: "tag", count: 0 },
    { event: "recommendation_view", source: "related", count: 10 },
    { event: "recommendation_view", source: "series", count: 5 },
    { event: "post_click", source: "related", count: 2 },
    { event: "post_click", source: "series", count: 1 },
    { event: "post_click", source: "search", count: 2 },
  ],
  engagedPosts: [{ slug: "example", count: 5 }],
  postReaders: {
    total: 20,
    posts: [{ slug: "example", count: 10 }],
  },
  coverage: completeCoverage,
};

const previousReaders = {
  events: [
    { event: "listing_view", count: 30 },
    { event: "post_view", count: 15 },
    { event: "engaged_read", count: 6 },
    { event: "search_used", count: 2 },
    { event: "search_no_results", count: 0 },
  ],
  sources: [
    { event: "post_click", source: "home", count: 4 },
    { event: "post_click", source: "blog", count: 2 },
    { event: "post_click", source: "tag", count: 1 },
    { event: "post_click", source: "related", count: 1 },
    { event: "post_click", source: "series", count: 0 },
    { event: "post_click", source: "search", count: 1 },
  ],
  sourceVisitors: [
    { event: "listing_view", source: "home", count: 20 },
    { event: "listing_view", source: "blog", count: 10 },
    { event: "listing_view", source: "tag", count: 5 },
    { event: "post_click", source: "home", count: 4 },
    { event: "post_click", source: "blog", count: 2 },
    { event: "post_click", source: "tag", count: 1 },
    { event: "recommendation_view", source: "related", count: 8 },
    { event: "recommendation_view", source: "series", count: 4 },
    { event: "post_click", source: "related", count: 1 },
    { event: "post_click", source: "series", count: 0 },
    { event: "post_click", source: "search", count: 1 },
  ],
  engagedPosts: [{ slug: "example", count: 3 }],
  postReaders: {
    total: 15,
    posts: [{ slug: "example", count: 8 }],
  },
  coverage: completeCoverage,
};

describe("weekly analytics metrics", () => {
  it("marks a range that started collecting midway as incomplete", () => {
    expect(
      coverageForRange("2026-08-17", "2026-08-24", "2026-08-20"),
    ).toEqual({ covered: 4, total: 7, complete: false });
  });

  it("marks a fully collected range as complete", () => {
    expect(
      coverageForRange("2026-08-24", "2026-08-31", "2026-08-20"),
    ).toEqual({ covered: 7, total: 7, complete: true });
  });

  it("calculates matched-denominator rates and point changes", () => {
    expect(ratePercent(15, 137)).toBeCloseTo(10.95);
    expect(ratePercent(0, 0)).toBeNull();
    expect(percentagePointChange(17.1, 11.8)).toBeCloseTo(5.3);
    expect(percentagePointChange(null, 11.8)).toBeNull();
  });
});

describe("weekly analytics report rendering", () => {
  it("renders Cloudflare and reader metrics with a reusable snapshot", () => {
    const result = buildWeeklyAnalyticsReport({
      siteTag: "site-tag",
      currentPeriod,
      previousPeriod,
      current: currentTraffic,
      previous: previousTraffic,
      currentDailyTraffic: [
        {
          date: "2026-08-24",
          count: 12,
          visits: 9,
          sampleInterval: 1.25,
        },
      ],
      readerAnalytics: currentReaders,
      previousReaderAnalytics: previousReaders,
      comparisonSource: "전주 확정 snapshot",
    });

    expect(result.visibleReport).toContain(
      "집계 기간: **2026-08-24 ~ 2026-08-30** (지난주 대비)",
    );
    expect(result.visibleReport).toContain(
      "| 방문 (visits) | 80 | 70 | ▲ 14% |",
    );
    expect(result.visibleReport).toContain(
      "| search.naver.com 🆕 | 10 |",
    );
    expect(result.visibleReport).toContain(
      "| 2026-08-24 | 9 | 12 | 1.25 |",
    );
    expect(result.visibleReport).toContain(
      "| 홈 | 20 → 8 (40.0%) | 20 → 4 (20.0%) | ▲ 20.0%p |",
    );
    expect(result.visibleReport).toContain(
      "| 글 방문자일 중 충분히 읽은 비율 | 10/20 (50.0%) | 6/15 (40.0% · 표본 부족) | 표본 부족 |",
    );
    expect(result.visibleReport).toContain(
      "> ⚠️ 한국 트래픽이 전체 페이지뷰의 90.0%예요.",
    );
    expect(result.visibleReport).not.toContain("analytics-snapshot");
    expect(result.report).toContain(
      '<!-- analytics-snapshot:{"version":2,"siteTag":"site-tag"',
    );
    expect(result.snapshot).toMatchObject({
      version: 2,
      siteTag: "site-tag",
      start: "2026-08-24",
      endExclusive: "2026-08-31",
      sampleInterval: 2,
    });
  });

  it("does not compare incomplete reader analytics", () => {
    const result = buildWeeklyAnalyticsReport({
      siteTag: "site-tag",
      currentPeriod,
      previousPeriod,
      current: currentTraffic,
      previous: previousTraffic,
      readerAnalytics: {
        ...currentReaders,
        coverage: {
          events: Object.fromEntries(
            Object.keys(completeCoverage.events).map((event) => [
              event,
              "2026-08-27",
            ]),
          ),
        },
      },
      previousReaderAnalytics: previousReaders,
      comparisonSource: "Cloudflare 재조회",
    });

    expect(result.visibleReport).toContain(
      "| 목록 화면 방문 | 40 | 30 | 비교 불가 | 이번 4/7일 · 지난 7/7일 |",
    );
    expect(result.visibleReport).toContain(
      "| 홈 | 20 → 8 (40.0%) | 20 → 4 (20.0%) | 비교 불가 |",
    );
  });

  it("shows vanished-country contribution without a small-sample dominance warning", () => {
    const result = buildWeeklyAnalyticsReport({
      siteTag: "site-tag",
      currentPeriod,
      previousPeriod,
      current: {
        ...currentTraffic,
        total: [
          { count: 25, sum: { visits: 3 }, avg: { sampleInterval: 1.02 } },
        ],
        countries: [
          { count: 25, sum: { visits: 3 }, dimensions: { countryName: "한국" } },
        ],
      },
      previous: {
        ...previousTraffic,
        total: [
          {
            count: 385,
            sum: { visits: 152 },
            avg: { sampleInterval: 1.19 },
          },
        ],
        countries: [
          { count: 346, sum: { visits: 140 }, dimensions: { countryName: "중국" } },
          { count: 39, sum: { visits: 12 }, dimensions: { countryName: "한국" } },
        ],
      },
      currentDailyTraffic: [
        {
          date: "2026-08-27",
          count: 0,
          visits: 0,
          sampleInterval: null,
        },
      ],
      readerAnalytics: null,
      previousReaderAnalytics: null,
      comparisonSource: "전주 확정 snapshot",
    });

    expect(result.visibleReport).toContain("| 중국 | 0 | 346 | -346 | 0.0% | 0 |");
    expect(result.visibleReport).toContain(
      "상위 국가 집계에서 중국 페이지뷰 변화(-346)가 전체 페이지뷰 변화(-360)의 96.1%에 해당해요.",
    );
    expect(result.visibleReport).not.toContain(
      "한국 트래픽이 전체 페이지뷰의 100.0%예요.",
    );
    expect(result.visibleReport).toContain(
      "일별 Cloudflare 페이지뷰가 0인 날짜(2026-08-27)가 있어요.",
    );
    expect(result.visibleReport).toContain(
      "sampling 변화만으로 원인을 설명하기는 어려워요.",
    );
  });

  it("flags invalid funnels instead of rendering rates over 100%", () => {
    const result = buildWeeklyAnalyticsReport({
      siteTag: "site-tag",
      currentPeriod,
      previousPeriod,
      current: currentTraffic,
      previous: previousTraffic,
      readerAnalytics: {
        ...currentReaders,
        events: currentReaders.events.map((row) =>
          row.event === "engaged_read" ? { ...row, count: 4 } : row,
        ),
        engagedPosts: [{ slug: "example", count: 4 }],
        postReaders: {
          total: 3,
          posts: [{ slug: "example", count: 3 }],
        },
      },
      previousReaderAnalytics: previousReaders,
      comparisonSource: "전주 확정 snapshot",
    });

    expect(result.visibleReport).toContain(
      "| 글 방문자일 중 충분히 읽은 비율 | 4/3 (집계 기준 불일치)",
    );
    expect(result.visibleReport).not.toContain("133.3%");
    expect(result.visibleReport).toContain("## 데이터 진단");
    expect(result.visibleReport).toContain(
      "충분히 읽은 방문자일(4)이 글 방문자일(3)보다 많아",
    );
  });
});
