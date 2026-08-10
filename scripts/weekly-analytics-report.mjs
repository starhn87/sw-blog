// Cloudflare Web Analytics(RUM) 주간 리포트 생성기.
// GraphQL Analytics API에서 최근 7일과 그 전 7일을 조회해 WoW 비교 마크다운을 만든다.
// GitHub Actions(weekly-analytics.yml)가 매주 실행해 이슈로 등록한다.
//
// 필요 env:
//   CLOUDFLARE_API_TOKEN  - Account Analytics:Read 권한 포함 토큰
//   CLOUDFLARE_ACCOUNT_ID - 계정 ID
//   CF_SITE_TAG           - Web Analytics site tag (비콘 token 값, 공개값)

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!TOKEN || !ACCOUNT) {
  console.error("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID env가 필요합니다.");
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

// siteTag는 REST로 실제 등록된 Web Analytics 사이트 목록에서 해석한다.
// (비콘에 노출되는 토큰과 GraphQL siteTag가 다른 경우가 있어 하드코딩하지 않는다)
async function resolveSiteTag() {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/rum/site_info/list`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  const json = await res.json();
  if (!json.success) {
    console.error(
      `Web Analytics 사이트 목록 조회 실패: ${JSON.stringify(json.errors)}\n` +
        "CF_SITE_TAG env로 직접 지정할 수도 있습니다.",
    );
    return process.env.CF_SITE_TAG ?? null;
  }
  const sites = json.result ?? [];
  console.error(
    "등록된 사이트:",
    sites.map((s) => `${s.ruleset?.zone_name ?? s.host ?? "?"} → ${s.site_tag}`).join(", "),
  );
  // 사이트가 여러 개면(수동 등록 + Pages 자동 주입) 최근 14일 데이터가 실제로 있는 쪽을 고른다.
  let best = null;
  for (const s of sites) {
    const count = await probePageviews(s.site_tag);
    console.error(`probe ${s.site_tag}: 최근 14일 페이지뷰 ${count}`);
    if (!best || count > best.count) best = { tag: s.site_tag, count };
  }
  return best?.tag ?? process.env.CF_SITE_TAG ?? null;
}

async function probePageviews(siteTag) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query ($accountTag: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
        viewer { accounts(filter: { accountTag: $accountTag }) {
          rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1) { count }
        } }
      }`,
      variables: {
        accountTag: ACCOUNT,
        filter: {
          AND: [
            { datetime_geq: iso(day(-14)), datetime_lt: iso(day(0)) },
            { siteTag },
          ],
        },
      },
    }),
  });
  const json = await res.json();
  return json.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups?.[0]?.count ?? 0;
}

const SITE_TAG = await resolveSiteTag();
if (!SITE_TAG) {
  console.error("siteTag를 찾지 못했습니다.");
  process.exit(1);
}
console.error(`사용할 siteTag: ${SITE_TAG}`);

// 이번 주 = 최근 7일(오늘 제외), 지난주 = 그 전 7일
const thisEnd = day(0);
const thisStart = day(-7);
const prevEnd = thisStart;
const prevStart = day(-14);

const QUERY = `
query ($accountTag: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      total: rumPageloadEventsAdaptiveGroups(filter: $filter, limit: 1) {
        count
        sum { visits }
      }
      topPaths: rumPageloadEventsAdaptiveGroups(
        filter: $filter, limit: 50, orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      topReferers: rumPageloadEventsAdaptiveGroups(
        filter: $filter, limit: 10, orderBy: [count_DESC]
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

async function fetchPeriod(start, end) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERY,
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

const pct = (cur, prev) => {
  if (!prev) return cur ? "신규" : "-";
  const p = ((cur - prev) / prev) * 100;
  const arrow = p > 0 ? "▲" : p < 0 ? "▼" : "―";
  return `${arrow} ${Math.abs(p).toFixed(0)}%`;
};
const refName = (host) => (host ? host : "(직접 유입)");

const cur = await fetchPeriod(thisStart, thisEnd);
const prev = await fetchPeriod(prevStart, prevEnd);

const curTotal = cur.total[0] ?? { count: 0, sum: { visits: 0 } };
const prevTotal = prev.total[0] ?? { count: 0, sum: { visits: 0 } };

const prevPathCount = new Map(
  prev.topPaths.map((r) => [r.dimensions.requestPath, r.count]),
);
const prevRefs = new Set(prev.topReferers.map((r) => r.dimensions.refererHost));

const lines = [];
lines.push(`집계 기간: **${dateLabel(thisStart)} ~ ${dateLabel(day(-1))}** (지난주 대비)`);
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
for (const row of cur.topReferers) {
  const host = row.dimensions.refererHost;
  const isNew = host && !prevRefs.has(host);
  lines.push(`| ${refName(host)}${isNew ? " 🆕" : ""} | ${row.count} |`);
}
lines.push("");
lines.push("## 국가");
lines.push("");
lines.push(
  cur.countries
    .map((r) => `${r.dimensions.countryName || "(미상)"} ${r.count}`)
    .join(" · "),
);
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

const comment = await claudeComment(lines.join("\n"));
if (comment) {
  lines.push("");
  lines.push("## Claude의 코멘트");
  lines.push("");
  lines.push(comment);
}

lines.push("");
lines.push("---");
lines.push(
  "_Cloudflare Web Analytics 기준. 표본 집계라 대시보드 수치와 약간 다를 수 있어요. 🆕 = 지난주 상위권에 없던 유입처. 코멘트는 Claude가 자동 생성해요._",
);

const report = lines.join("\n");
const { writeFileSync } = await import("node:fs");
writeFileSync("analytics-report.md", report);
console.log(report);
console.log(`\n::notice::기간 ${dateLabel(thisStart)}~${dateLabel(day(-1))} 리포트 생성 완료`);
