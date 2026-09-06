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
  ANALYTICS_SNAPSHOT_PREFIX,
  buildWeeklyAnalyticsReport,
} from "./weekly-analytics-render.mjs";

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

const PREVIOUS_REPORT_PATH = "previous-analytics-report.md";

function loadPreviousSnapshot() {
  if (!existsSync(PREVIOUS_REPORT_PATH)) return null;
  const report = readFileSync(PREVIOUS_REPORT_PATH, "utf8");
  const start = report.indexOf(ANALYTICS_SNAPSHOT_PREFIX);
  if (start === -1) return null;
  const end = report.indexOf(" -->", start);
  if (end === -1) return null;

  try {
    const snapshot = JSON.parse(
      report.slice(start + ANALYTICS_SNAPSHOT_PREFIX.length, end),
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

const { visibleReport, report } = buildWeeklyAnalyticsReport({
  siteTag: SITE_TAG,
  currentPeriod: {
    start: thisStart,
    endExclusive: thisEnd,
    endInclusive: day(-1),
  },
  previousPeriod: { start: prevStart, endExclusive: prevEnd },
  current: cur,
  previous: prev,
  readerAnalytics,
  previousReaderAnalytics,
  comparisonSource,
});
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
