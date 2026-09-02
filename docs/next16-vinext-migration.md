# Next.js 16 + vinext + Cloudflare Workers 마이그레이션 계획

> 상태: 2026-09-02 구현 시작 — Next.js 16 + OpenNext 후보의 로컬 검증 완료, 운영 미전환.
>
> vinext SSG 차단 재현으로 아래 fallback 조건을 적용했다. 최신 판단과 실행 순서는
> [진행 기록](./next16-workers-progress.md)을 우선한다. 아래 내용은 최초 계획이다.
>
> 마지막 검토: 2026-09-02

## 목적

현재의 `Next.js 15 + @cloudflare/next-on-pages + Cloudflare Pages` 구성을
`Next.js 16 + vinext + Cloudflare Workers`로 이전한다. 프레임워크와 배포
어댑터를 함께 교체하는 작업이므로 운영 Pages를 유지한 상태에서 Worker를
병렬로 검증한 뒤 도메인만 전환한다.

이 문서는 실행 순서와 판단 기준을 남기기 위한 계획서다. 문서 작성 시점에는
의존성, 애플리케이션 코드, Cloudflare 설정을 변경하지 않는다.

## 결론

- 목표 버전은 작업 시작 시점의 최신 보안 패치가 적용된 Next.js 16.x다.
- Cloudflare 배포 경로는 vinext를 1순위로 사용한다.
- OpenNext는 vinext에서 해결할 수 없는 호환성 문제가 실제로 확인될 때만
  대안으로 사용한다.
- D1, R2, Workers AI, Vectorize의 기존 데이터와 리소스는 그대로 재사용한다.
- Cache Components, ISR용 KV, Cloudflare Images 같은 신규 기능은 이번
  마이그레이션에 포함하지 않는다.
- 운영 도메인은 Worker Preview 검증이 모두 끝난 뒤 별도 승인하에 전환한다.

Cloudflare는 현재 기존 Next.js 16 앱에 vinext를 추가해 Workers로 배포하는
경로를 기본으로 권장한다. OpenNext는 기존 OpenNext 앱을 유지하거나 vinext의
호환성 공백을 피해야 할 때 사용하는 경로로 안내한다.

## 현재 기준선

| 항목 | 현재 상태 |
| --- | --- |
| Framework | Next.js 15.5.21 App Router |
| React | React / React DOM 19.2.7 |
| 배포 | Cloudflare Pages |
| 어댑터 | `@cloudflare/next-on-pages` 1.13.16 |
| 런타임 | 모든 API Route Handler가 `runtime = "edge"` |
| 바인딩 접근 | `getRequestContext().env` |
| 콘텐츠 | `generateStaticParams`로 게시글 SSG |
| 동적 기능 | D1, R2, Workers AI, Vectorize, Claude API, Web Push |

2026-09-01에 깨끗한 임시 사본에서 실행한 `vinext check` 결과는 91% 호환이다.
App Router와 12개 Route Handler, 현재 사용하는 주요 `next/*` API는 지원됐다.
확인된 주요 대응 항목은 다음과 같다.

- `package.json`에 ESM 설정 추가
- `next/font/google`의 Geist Mono를 로컬 폰트로 전환
- `getRequestContext()`를 `cloudflare:workers`의 `env` 접근으로 교체
- Pages 전용 설정과 빌드 명령 제거
- `middleware.ts`와 광범위한 matcher 재검토

이 결과는 당시 버전의 스냅샷일 뿐이다. 실행 직전 반드시 다시 검사한다.
기존 `.open-next` 산출물이 검사 결과에 섞이면 거짓 양성이 발생할 수 있으므로
빌드 산출물을 제외한 깨끗한 작업 트리에서 검사한다.

## 범위

### 포함

- Next.js 15에서 최신 패치된 16.x로 업그레이드
- React, React DOM, Next.js 관련 타입과 ESLint 패키지 정렬
- Next.js 16의 `proxy` 규칙과 Turbopack 기본값 대응
- vinext와 Cloudflare Vite 플러그인 도입
- Pages 전용 next-on-pages 코드 제거
- Route Handler의 Cloudflare binding 접근 방식 변경
- Workers용 Wrangler 구성과 타입 생성
- Workers Preview 배포 및 운영 검증
- Pages 자동 배포를 Workers Builds 또는 Wrangler 기반 배포로 교체
- 재인덱싱 workflow와 분석 제외 호스트 갱신
- Custom Domain을 Pages에서 Worker로 전환
- `ARCHITECTURE.md`의 실제 운영 구조 갱신

### 제외

- D1 스키마 변경이나 마이그레이션
- D1, R2, Vectorize 데이터 복사 또는 재생성
- 콘텐츠 및 UI 개편
- Cache Components 활성화
- PPR 또는 ISR 도입
- vinext KV 캐시 도입
- `next/image` 또는 Cloudflare Images 신규 도입
- 별도 관측·로깅 유료 기능 도입

범위 밖의 변경이 필요해지면 마이그레이션과 섞지 않고 별도 작업으로 분리한다.

## 목표 구조

```text
GitHub main
  ├─ CI: pnpm verify
  └─ Workers Builds 또는 Wrangler deploy
       └─ vinext + Vite build
            ├─ Workers Static Assets: SSG HTML, JS, CSS, public 자산
            └─ Worker: Route Handlers, proxy, RSC 런타임
                 ├─ 기존 D1 DB
                 ├─ 기존 R2 bucket
                 ├─ 기존 Vectorize index 2개
                 ├─ Workers AI
                 └─ Claude API secret
```

정적 파일은 Static Assets가 직접 제공하고 API와 실제 동적 요청만 Worker가
실행하도록 구성한다. 비용과 CPU 사용량을 불필요하게 늘릴 수 있으므로 모든
요청에 Worker를 강제하는 설정은 사용 근거가 있을 때만 추가한다.

## 실행 전 재검토

작업을 시작하는 날 아래 항목부터 다시 확인한다.

1. Next.js 16의 최신 패치 버전과 보안 공지를 확인한다.
2. `vinext`, `@vinext/cloudflare`, Vite, Wrangler의 최신 호환 버전을 확인한다.
3. Cloudflare의 Next.js 권장 배포 경로가 여전히 vinext인지 확인한다.
4. `pnpm dlx vinext check`를 깨끗한 작업 트리에서 다시 실행한다.
5. vinext compatibility dashboard에서 `next/font`, proxy, Route Handler,
   static generation 관련 상태를 확인한다.
6. 현재 `main`에서 `pnpm verify`와 production build가 통과하는지 기록한다.
7. Cloudflare Pages의 production/preview binding과 환경변수 목록을 내보내거나
   안전한 별도 목록으로 대조한다. 값 자체는 저장소 문서에 기록하지 않는다.

다음 조건이면 구현을 보류한다.

- 핵심 Route Handler 또는 SSG 경로가 vinext에서 지원되지 않는다.
- Worker Preview에서 데이터 손상 없이 D1/R2/Vectorize를 검증할 방법이 없다.
- 운영 rollback 경로를 마련하지 못했다.
- vinext beta의 알려진 문제가 현재 기능에 직접 영향을 준다.

## 단계별 실행 계획

### 0. 기준선 고정

- 별도 migration 브랜치에서 시작한다.
- 현재 production URL의 핵심 동작과 응답 헤더를 기록한다.
- 홈, 글 목록, 글 상세, 태그, RSS, sitemap, admin과 모든 API의 smoke test
  목록을 확정한다.
- 현재 Worker/Pages 요청량과 비용을 기록해 전환 후 비교 기준으로 삼는다.

완료 조건:

- `pnpm verify` 통과
- 현행 Pages production 동작 확인
- Cloudflare binding과 secret 체크리스트 작성

### 1. Next.js 16 코드 호환

- 공식 codemod 결과를 검토한 뒤 최신 패치된 Next.js 16과 React를 적용한다.
- `next dev --turbopack`의 불필요한 명시 옵션을 정리한다.
- `middleware.ts`를 `proxy.ts`와 `proxy()`로 이전할지 결정한다.
  - 현재 로직은 도메인 redirect와 preview noindex뿐이다.
  - 단순 redirect는 Cloudflare Redirect Rules 또는 정적 설정으로 옮길 수 있는지
    먼저 검토한다.
  - proxy가 모든 정적 문서 요청을 Worker 호출로 바꾸지 않는지 측정한다.
- 기존 Route Handler의 Edge runtime 선언은 vinext 단계 전까지 성급하게
  제거하지 않는다.
- Cache Components는 활성화하지 않고 현재 SSG 의미를 보존한다.

완료 조건:

- 표준 `next dev`, `next build`, `pnpm verify` 통과
- 홈과 모든 정적 경로의 생성 결과가 기존과 동일
- proxy의 redirect, noindex 동작 검증

주의: Next.js 16의 `proxy`는 Node.js runtime을 사용하며 Edge runtime을
지원하지 않는다. 현재 로직은 단순하지만, 파일명만 바꾸고 넘어가지 않는다.

### 2. vinext를 병행 경로로 추가

- `vinext init --platform=cloudflare`가 만드는 변경을 그대로 수용하지 않고
  diff를 검토한다.
- 기존 `next dev`와 `next build`는 초기 검증 동안 유지한다.
- `dev:vinext`, `build:vinext`, preview/deploy 명령을 별도로 둔다.
- `package.json`에 `"type": "module"`을 추가하고 CommonJS 설정 파일 충돌을
  점검한다.
- `vite.config.ts`와 필요한 Cloudflare 플러그인을 추가한다.
- Geist Mono는 로컬 폰트 파일 또는 신뢰할 수 있는 로컬 패키지로 전환해
  외부 CDN 의존을 만들지 않는다.

완료 조건:

- `vinext check`의 차단 이슈 0건
- vinext 개발 서버에서 주요 페이지와 API가 실행됨
- vinext production build 성공

### 3. Cloudflare 런타임과 binding 이전

- 모든 `@cloudflare/next-on-pages` import를 제거한다.
- Server Component와 Route Handler에서 `cloudflare:workers`의 `env`를 사용한다.
- `ctx.waitUntil` 사용부는 vinext/Workers에서 지원되는 실행 컨텍스트 접근으로
  변경하고 Web Push 비동기 전송을 검증한다.
- 모든 API Route Handler의 `runtime = "edge"`를 제거하고 Worker runtime에서
  동작하도록 한다.
- `wrangler types`로 binding 타입을 생성하고 수동 `CloudflareEnv` 선언과의
  중복을 정리한다.
- `next.config.mjs`의 `setupDevPlatform()`과 next-on-pages 의존성을 제거한다.

완료 조건:

- D1 조회/쓰기, R2 CRUD, Workers AI embedding, Vectorize query/upsert 성공
- 댓글·좋아요 후 `waitUntil` 기반 Web Push 처리 성공
- Claude streaming 응답 성공
- 로컬과 Worker Preview의 binding 타입 및 런타임 오류 0건

### 4. Workers 구성

Pages 전용 `pages_build_output_dir`를 제거하고 vinext가 생성한 최신 형식에 맞춰
Worker 진입점과 assets 구성을 사용한다. 구체적인 출력 경로는 vinext beta에서
바뀔 수 있으므로 이 문서에 고정하지 않고 실행 시 생성 결과를 확인한다.

유지할 binding:

| Binding | 대상 |
| --- | --- |
| `DB` | 기존 `sw-blog-db` D1 |
| `MEDIA` | 기존 `sw-blog-media` R2 |
| `AI` | Workers AI |
| `VECTORIZE` | 기존 검색 인덱스 |
| `RAG_VECTORIZE` | 기존 RAG 인덱스 |

설정 원칙:

- `nodejs_compat`를 유지한다.
- `compatibility_date`는 작업일 기준으로 갱신하고 Preview에서 검증한다.
- production binding은 기존 리소스 ID를 그대로 가리킨다.
- Worker 이름, route, custom domain은 가능한 한 Wrangler 설정을 단일 원천으로
  관리한다.
- 정적 자산이 Worker를 거치지 않도록 assets routing 결과를 확인한다.
- CPU limit을 설정해 예상치 못한 장시간 실행과 비용을 방지한다.
- 관측 기능은 기본 포함 범위에서 시작하고 유료 기능은 별도 결정한다.

### 5. 환경변수와 secret 이전

Pages에 등록된 값을 자동 복사된다고 가정하지 않는다. 값은 문서나 git에
기록하지 않고 Worker secret 또는 Workers Builds 환경변수로 다시 등록한다.

| 종류 | 이름 | 처리 |
| --- | --- | --- |
| Runtime secret | `ANTHROPIC_API_KEY` | Worker secret |
| Runtime secret | `ADMIN_PASSWORD` | Worker secret |
| Runtime secret | `VAPID_PRIVATE_KEY` | Worker secret |
| Runtime value | `VAPID_SUBJECT` | Worker secret 또는 일반 변수 |
| Build-time public | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Workers Builds 환경변수 |
| Build-time public | `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | Workers Builds 환경변수 |

`CF_AIG_TOKEN`은 타입에는 있지만 현재 애플리케이션 사용처가 없으므로 실제
사용 여부를 확인한 뒤 불필요하면 이전하지 않고 선언을 삭제한다. GitHub
Actions의 Cloudflare API token, account ID, analytics site tag는 앱 runtime
secret과 구분해 기존 GitHub Secrets에서 관리한다.

Preview에서 production D1/R2/Vectorize에 쓰기 요청을 보내지 않도록 다음 중
하나를 구현 전에 선택한다.

- 별도 preview 리소스와 Wrangler environment 사용
- mutation API를 차단한 제한된 Preview Worker 사용
- 명시적으로 선택한 테스트 레코드만 production 리소스에서 검증하고 즉시 정리

기본 선택은 별도 preview 리소스 또는 mutation 차단이다.

### 6. 배포 자동화와 후속 작업

- 현재 Pages Git integration을 Workers Builds로 교체하거나 GitHub Actions에서
  검증 후 Wrangler로 배포한다.
- 현재 `reindex.yml`의 Pages Deployments API polling을 Worker 배포 완료 확인
  방식으로 교체한다.
- 배포가 성공한 production commit과 재인덱싱 대상 commit이 동일한지 검증하는
  성질은 유지한다.
- `weekly-analytics-report.mjs`의 `sw-blog.pages.dev` 제외 규칙을 새 Worker
  preview hostname에 맞게 갱신한다.
- CI의 Node.js 버전이 Next.js 16 최소 요구사항을 충족하는지 확인한다.

기본 선택은 현재 Pages 자동 배포 경험과 유사한 Workers Builds다. 다만 commit
상태 조회와 재인덱싱 연동이 불명확하면 GitHub Actions 단일 pipeline으로
배포와 재인덱싱을 묶는다.

완료 조건:

- main push 없이 수동 Preview 배포 가능
- production/preview 환경이 명확히 분리됨
- 실패한 배포에서는 재인덱싱이 실행되지 않음
- 성공한 콘텐츠 배포 후 두 Vectorize 인덱스가 갱신됨

### 7. Worker Preview 검증

기능:

- 홈, 글 목록, 글 상세, 태그, about
- RSS, sitemap, robots, metadata, OG image
- 조회수, 좋아요, 댓글/답글, 댓글 좋아요
- 검색과 검색 인덱싱
- RAG 챗봇 streaming과 RAG 인덱싱
- R2 media 조회/업로드/이름변경/삭제
- Web Push 구독/해제와 알림
- Google/Naver 지도
- admin 인증과 noindex
- custom 404와 redirect

비기능:

- SSG 페이지가 static asset으로 제공되는지 확인
- 기존 Pages 대비 응답 코드, Cache-Control, 보안 헤더 비교
- 모바일/데스크톱 Core Web Vitals와 Lighthouse 비교
- Worker request, CPU time, 오류, D1/R2/AI/Vectorize 호출량 비교
- Worker bundle 크기와 Free/Paid plan 한도 확인
- Preview URL이 검색 엔진에 노출되지 않도록 noindex 확인

릴리스 차단 기준:

- 데이터 손실 또는 production 데이터 오염
- SEO canonical, sitemap, robots, noindex 회귀
- SSG 페이지가 불필요하게 전부 Worker invocation으로 계산됨
- 기존 API 응답이나 streaming 동작 회귀
- 현재 대비 설명할 수 없는 비용·CPU 증가
- rollback 절차 미검증

### 8. 운영 전환

1. Pages production은 그대로 유지한다.
2. 최종 Worker version을 Preview URL에서 승인한다.
3. production secret과 binding을 최종 대조한다.
4. Pages 자동 배포를 중지하되 프로젝트와 마지막 성공 배포는 삭제하지 않는다.
5. `www.seung-woo.me` Custom Domain을 Pages에서 분리해 Worker에 연결한다.
6. 루트 도메인 redirect와 인증서를 확인한다.
7. 핵심 smoke test와 Vectorize 재인덱싱을 실행한다.
8. 최소 7일 동안 오류, CPU, 요청 수, D1/R2/AI 비용, SEO 크롤링을 관찰한다.
9. 안정화 후에만 Pages 프로젝트 삭제 여부를 별도로 결정한다.

Custom Domain 전환과 Pages 자동 배포 중지는 외부 상태를 바꾸는 작업이므로
실행 직전에 사용자 승인을 받는다.

## rollback

전환 직전의 Pages production deployment를 보존한다. 장애가 발생하면:

1. Worker Custom Domain 연결을 제거한다.
2. 동일 도메인을 보존한 Pages project에 다시 연결한다.
3. production URL에서 smoke test를 실행한다.
4. 재인덱싱은 콘텐츠가 달라졌을 때만 Pages 버전에 맞춰 다시 실행한다.
5. 장애 원인과 Worker version을 기록하고 다음 시도 전 차단 조건을 추가한다.

이번 마이그레이션에서는 DB 스키마와 데이터 형식을 변경하지 않으므로 Pages로
되돌려도 기존 D1/R2/Vectorize 데이터가 호환돼야 한다. 이 불변 조건을 깨는
변경은 별도 배포로 분리한다.

## 비용 가드레일

Pages Functions도 Workers 요청으로 계산되므로 배포 대상 변경 자체에 새로운
고정비가 생기지는 않는다. Pages와 Workers 모두 정적 자산 요청은 무료다.

비용 중립을 유지하기 위해:

- 정적 문서와 자산은 Worker를 거치지 않게 한다.
- Cache Components, ISR용 KV, Workers Cache를 이번 범위에 추가하지 않는다.
- Cloudflare Images는 현재 사용 방식이 필요로 할 때만 별도 검토한다.
- Worker CPU limit을 설정한다.
- 전환 전후 7일의 Worker invocation과 CPU time을 비교한다.
- AI, Vectorize, D1, R2 사용량 증가는 마이그레이션 효과와 트래픽 증가를
  구분해 판단한다.

Preview와 Pages를 병행 배포하는 기간에도 배포가 존재하는 것만으로 요금이
두 배가 되지는 않는다. 실제 요청과 유료 리소스 사용량만 증가 요인이 된다.

## 권장 커밋 단위

실제 구현 시 한 커밋에 한 목적만 담는다.

1. `Upgrade framework compatibility for Next.js 16`
2. `Adapt request proxy behavior for Next.js 16`
3. `Add the vinext Workers build path`
4. `Migrate Cloudflare runtime bindings from Pages`
5. `Configure Workers deployment without replacing Pages`
6. `Update deployment-aware indexing and analytics workflows`
7. `Document the Workers production architecture`

각 커밋은 `pnpm verify`와 해당 단계의 build를 통과한 상태로 만든다. Worker
Preview 배포 전까지 Pages production 경로를 제거하지 않는다.

## OpenNext 전환 조건

다음 문제가 재현되고 vinext에서 현실적인 해결책이 없을 때만 OpenNext를
선택한다.

- Next.js 16의 실제 `next build` 의미 보존이 필요한 기능에서 차단됨
- SSG, proxy, Route Handler 또는 streaming에 운영 차단 수준의 차이가 있음
- 이미지/캐시 동작의 차이를 우회하려면 과도한 커스텀 코드가 필요함
- vinext beta 회귀가 릴리스 일정과 맞지 않음

OpenNext를 선택하면 실제 `next build` 산출물을 변환하는 별도 계획으로 이
문서를 갱신한다. vinext와 OpenNext를 동시에 production 배포 경로로 유지하지
않는다.

## 완료 정의

- 최신 패치된 Next.js 16과 vinext production build가 통과한다.
- `@cloudflare/next-on-pages`와 Pages 전용 runtime 코드가 제거됐다.
- 기존 기능, 데이터, SEO, 성능에 차단 회귀가 없다.
- 기존 Cloudflare binding과 secret이 Worker에서 정상 동작한다.
- 정적 요청과 동적 Worker 요청이 의도한 대로 분리된다.
- CI, 배포, 재인덱싱, 분석 리포트가 Workers 기준으로 동작한다.
- Custom Domain 전환과 rollback이 검증됐다.
- 전환 후 비용이 기존 허용 범위 안에 있다.
- `ARCHITECTURE.md`가 실제 production 구성을 설명한다.

## 공식 참고 자료

- [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Cloudflare의 Next.js / vinext 가이드](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Pages에서 Workers로 이전](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare OpenNext 가이드](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers 한도](https://developers.cloudflare.com/workers/platform/limits/)

문서가 오래된 상태에서 실행되지 않도록 작업 시작일에 모든 공식 링크와
버전·지원 상태를 다시 확인한다.
