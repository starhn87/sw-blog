# 독자 분석 운영 기록

## 2026-10-03 점검

주간 리포트 #10~#12에서 Cloudflare 방문·페이지뷰가 0으로 나왔지만 D1에는 글 방문이 남아 있었다. 두 시스템의 집계 방식은 다르므로 방문 감소나 수집 장애로 바로 해석하지 않았다.

Cloudflare 통합 CLI `cf@1.0.0-beta.12`로 RUM 설정을 조회했다. 기존 Wrangler 인증과 별개로 사용자가 device 인증을 승인했다. 프로젝트 의존성·Wrangler 설정·배포 경로는 변경하지 않았다.

| 항목 | 점검 결과 |
| --- | --- |
| 주간 리포트 siteTag | `f9fe631f1ab8491b94ebc157812b5072` |
| 공개 비콘 token | `7638c47570614969b00e3429d1419f48` |
| 기존 등록 호스트 | `(sw-blog.pages.dev)$` (`is_host_regex=true`) |
| 승인 후 등록 호스트 | `seung-woo.me` |
| 자동 삽입 | `false` 유지 |

등록 호스트가 운영 도메인과 달랐다. 사용자의 승인 후 기존 사이트의 호스트만 변경했고, GET 재조회로 호스트·siteTag·token·생성일·자동 삽입 상태를 확인했다. 별도 도메인 RUM의 자동 삽입은 계속 꺼져 있다. 사이트나 과거 데이터를 삭제하지 않았다.

[Cloudflare FAQ](https://developers.cloudflare.com/web-analytics/faq/)는 등록 호스트와 실제 호스트가 다르면 수집 요청에 CORS 오류가 생길 수 있다고 설명한다. `seung-woo.me` 등록으로 www·루트를 같은 비콘으로 사용할 수 있다. 이 설정 수정만으로 실제 전송 성공과 집계 반영까지 증명되는 것은 아니며, 수집하지 못한 과거 기간도 복구되지 않는다.

변경 후 운영 홈에서 정상 방문을 한 번 수행했다. 비콘은 기존 token으로 한 개만 로드됐고 브라우저 콘솔 오류는 없었다. 2026-10-03 15:05 UTC에 같은 siteTag의 GraphQL 집계를 재조회해 `/` 페이지뷰 1건·방문 1건을 확인했다. 새 데이터가 수집되는 것은 확인했지만, 이 한 건으로 모든 페이지의 수집이나 이후 주간 리포트의 완전성을 보장하지는 않는다.

## 집계 해석

- 집계 가능 기간은 이벤트 도입일과 요청 기간의 겹치는 날짜 수다. `7/7일`은 7일 내내 전송에 성공했다는 뜻이 아니다.
- 실제 기록일은 해당 이벤트가 1건 이상 저장된 UTC 날짜 수다. 기록일 0일을 수집 장애로 단정하지 않는다.
- D1 일별 표는 이벤트별 중복 제거 건수다. 전역 고유 방문자 수나 Cloudflare 페이지뷰가 아니다.
- 목록·추천 노출은 있는데 글 클릭이 0이면 직접 유입·검증 방문·전송 실패를 함께 확인한다.
- 노출이 20건 이상이고 하루에 70% 이상 몰리면 날짜와 비중을 표시한다. 국가나 User-Agent로 봇을 추정하지 않는다.
- 모토맵·App Store 이동은 글·목적지·방문자일 기준 클릭이다. 설치·가입이나 상대 사이트의 방문 수는 알 수 없다.

원문 URL·쿼리 문자열·검색어·IP·User-Agent는 D1 참여 이벤트에 저장하지 않는다. 외부 링크는 기존 `https://motomap.kr/`와 `https://apps.apple.com/app/id6773636183`만 허용하고 목적지 식별자만 저장한다. 기존 날짜별 visitor hash와 중복 제거 기준을 사용하므로 DB 마이그레이션은 없다.

## 검증 방문 제외

D1 전송은 `is-admin`, `analytics-opt-out`, `navigator.webdriver=true`를 제외한다. RUM도 최초 로딩 때 같은 조건을 확인한다. 자동화 플래그를 제공하지 않는 도구까지 자동으로 식별할 수 있는 것은 아니다.

수동 운영 검증은 대상 origin에서 아래 설정을 한 뒤 새로고침한다. 이미 로딩된 RUM 비콘은 플래그만 바꿔 중지되지 않는다.

```js
localStorage.setItem("analytics-opt-out", "true");
// 새로고침 후 검증
```

검증을 마치면 `localStorage.removeItem("analytics-opt-out")` 후 새로고침한다. www·루트는 서로 다른 origin이므로 각각 설정한다. Preview·localhost는 RUM을 로드하지 않는다.

RUM 수집 복구를 확인하는 최소 정상 방문은 제외 플래그 없이 수행하되, 그 검증 방문이 실제 집계에 남는다는 점을 감안한다. 수집 확인을 위해 가짜 비콘 POST나 운영 D1 이벤트를 주입하지 않는다.

## 배포 전 검증 결과

- `pnpm verify`: 테스트 448개, lint·typecheck·MDX alt 검사 통과.
- 운영 Workers build·dry-run 통과. gzip 번들 1718.79 KiB로 Free 한도 3072 KiB 이내.
- 로컬 Worker smoke: 글 25개, SEO·RSC·API 조회·인증·Preview 정책 통과.
- 격리된 로컬 D1에서 외부 이동의 두 목적지, 중복 제거, 잘못된 목적지 거부, 일별 이벤트·출처 합계를 확인했다. 운영 D1에는 검증 이벤트를 넣지 않았다.

코드 push·운영 배포는 아직 하지 않았다. RUM 호스트 수정만 사용자 승인 후 반영했다.

## 코드 배포 전후

1. `pnpm verify`, 운영 Workers build·dry-run·Free 번들 예산 검사를 통과시킨다.
2. 사용자 승인 후 최소 단위 커밋을 push하고 `Deploy Workers` 전체 성공을 확인한다.
3. `/api/analytics`의 `daily`·`dailySources` 응답, 일반/새 창/가운데 버튼 링크 이동을 확인한다. 새 이벤트 도입일이 실제 배포 UTC 날짜와 달라졌다면 `ANALYTICS_EVENT_START_DAYS`를 배포일에 맞춘다.
4. 운영 비콘이 한 개만 로드되고 기존 token을 사용하는지 확인한다. 수집 요청·같은 siteTag의 새 집계까지 확인한 뒤 복구로 판정한다.
5. 다음 리포트는 실제 기록일과 일별 집중도를 먼저 확인한다. 새 외부 이동 이벤트의 도입 전 주간 증감을 계산하지 않는다.

`cf rum site-info list/get`은 설정 조회에 사용한다. 운영 프로젝트 build·배포는 기존 Wrangler/OpenNext 절차를 유지하며 `cf migrate`, `cf build`, `cf deploy`를 실행하지 않는다.
