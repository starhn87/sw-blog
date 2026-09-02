# Next.js 16 · Workers 전환 진행 기록

> 2026-09-02: 로컬 후보 구현·검증 완료. 운영은 아직 Pages이며 푸시·원격 배포·도메인 전환은 하지 않았다.

## 현재 결정

- Next.js 16.3.4 / React 19.2.8 / OpenNext Cloudflare 1.20.6 / Wrangler 4.128.0.
- 브랜치: `codex/next16-vinext`. 이름은 최초 계획을 유지하지만 실제 어댑터는 OpenNext다.
- 기존 D1/R2/Vectorize 리소스를 가리키는 `wrangler.worker.jsonc`를 별도로 만들었다.
- `wrangler.toml`과 운영 Pages project, 배포 자동화, 재인덱싱 workflow는 아직 유지한다.
- 새 코드에는 next-on-pages와 Edge runtime 선언이 없다. **이 브랜치를 기존 Pages 빌드로 배포하면 안 된다.**
- Cache Components, ISR, KV, 캐시용 R2, Durable Objects, Images, Workers Cache는 추가하지 않았다.

최초 계획은 [next16-vinext-migration.md](./next16-vinext-migration.md)다.
아래 실행 결과가 최초 계획의 가정과 다를 때는 이 기록을 우선한다.

## vinext 대신 OpenNext를 선택한 이유

깨끗한 임시 사본에서 vinext 1.0.0-beta.8과 Cloudflare adapter 1.0.0-beta.6을 확인했다.

1. 호환성 검사 결과는 91%였다.
2. `prerender: { routes: "*" }`를 켠 빌드에서 게시글 25편을 포함한 31개 경로가 생성됐다.
3. 그러나 캐시를 추가하지 않은 기본 Worker를 로컬 workerd로 실행하면 홈에 글이 없고 `/blog/postgis-location-search`가 404로 응답했다.
4. 산출물은 `dist/server/prerendered-routes`에 있고, Static Assets 디렉터리 `dist/client`에는 없었다.
5. 배포 코드의 prerender 업로드 경로는 KV adapter 설정이 있을 때만 실행됐다. 기본 Node 서버의 메모리 캐시 초기화와 Worker 배포는 다른 경로였다.

따라서 `fs`로 읽는 MDX를 빌드 때만 처리한다는 기존 전제가 Worker에서 깨졌다.
KV를 추가하거나 별도 HTML/RSC 제공 계층을 만드는 대신, 최초 계획에 명시한
“SSG 호환성 차단 시 OpenNext” 조건을 적용했다. vinext 자체가 모든 SSG를
지원하지 않는다는 뜻이 아니라, **이 앱의 캐시 없는 기본 배포 경로**에서 확인한 문제다.

## 구현한 구성

`open-next.config.ts`는 공식 [SSG용 Static Assets 캐시](https://opennext.js.org/cloudflare/caching#ssg-site)를 사용한다.
빌드 결과는 `.open-next/assets/cdn-cgi/_next_cache`에 읽기 전용으로 보관된다.
`workers:preview`는 로컬 실행 전에 해당 캐시를 채운다. 단순 `wrangler dev`만
실행하면 이 준비 단계가 빠질 수 있으므로 지정된 스크립트를 사용한다.

- `getRequestContext()` → `getCloudflareContext()`.
- 알림의 `ctx.waitUntil`은 OpenNext context를 통해 유지한다.
- `next dev`는 `initOpenNextCloudflareForDev()`로 로컬 binding을 제공한다.
- `pnpm cf:typegen`으로 `cloudflare-env.d.ts`를 생성한다. Secret 값은 포함하지 않는다.
- `.workers.dev`와 Pages preview의 mutation API는 403으로 차단한다.
- HTML/API noindex는 `proxy.ts`, 정적 파일 noindex는 `public/_headers`가 담당한다.
- Worker CPU limit은 1,000 ms로 설정했다. 원격 CPU 측정 후 적정값을 재검토한다.
- CI에 Workers build와 dry-run을 추가했지만 원격 업로드 단계는 없다.

### 캐시 최적화 회귀 대응

`enableCacheInterception: true`에서는 Next.js 16의 `/_tree` segment prefetch에
전체 페이지 RSC가 반환됐다. 브라우저가 prefetch를 반복했다.
이 선택적 최적화를 끄면 Next.js가 올바른 segment tree를 반환하고 클라이언트
이동이 정상 동작한다. `scripts/smoke-workers.mjs`가 응답 형태를 검사한다.

### 아직 남아 있는 빌드 경고

- OpenNext는 Node.js proxy 지원을 experimental로 표시한다. 현재 redirect·noindex·쓰기 차단은 로컬에서 검증했지만 원격에서도 재검증해야 한다.
- workerd package 조건 복사 중 일부 MDX 의존성에 `Failed to copy` 로그가 남는다. `unified`의 문자열형 `exports: "./index.js"`에 OpenNext의 `transformPackageJson`이 `in` 연산자를 적용해 TypeError가 발생함을 재현했다. 모듈이 실제로 없는 경우와는 다르다. 빌드 exit code는 0이고 25편의 HTML/RSC가 정상 제공됐으나 upstream 수정 및 깨끗한 CI 결과 확인은 남아 있다.
- MDX 관련 번들에서 direct eval 경고가 있다. 현재 게시글은 SSG 결과로 제공하며 런타임 MDX 컴파일은 전제하지 않는다.

## 검증 결과

| 항목 | 결과 |
| --- | --- |
| Next.js 15 기준선 verify / build | 통과 |
| Next.js 16 `next dev` / `next build` | 통과 |
| `pnpm verify` | 통과: 7개 파일, 42개 테스트, MDX 26개 alt 검사 |
| `pnpm workers:build` | 통과: 게시글 25편 SSG, API 동적 경로 유지 |
| Wrangler `deploy --dry-run` | 통과, 실제 업로드 없음 |
| 브라우저 | 홈 → PostGIS 글 이동, 본문·히어로·제목·canonical, console error 없음 |
| Workers smoke | 25편, 홈·목록·태그·about·admin, RSS·sitemap·robots·404, RSC segment tree |
| 로컬 API | 조회·인증 거부, Preview mutation 403·noindex·Pages canonical redirect |
| 로컬 D1 | 좋아요 토글, 댓글·답글 작성, 댓글 수정·좋아요, 삭제·정리 통과 |
| 원격 AI / Vectorize / Claude / Web Push | 미검증, 실제 호출하지 않음 |
| 운영 R2 CRUD / 지도 API | 미검증 |
| 원격 Preview / CPU·성능·요금 비교 / 도메인 rollback | 미검증 |

로컬 테스트용 댓글·좋아요는 삭제했다. 브라우저 테스트의 조회·참여 이벤트는
로컬 D1에만 기록됐다. 운영 데이터와 DB 스키마는 변경하지 않았다.
`ctx.waitUntil`이 있는 API 응답은 확인했지만 실제 구독자에게 알림이 도착했다는
검증을 대신하지는 않는다.

## 비용 관련: 최초 계획에서 수정해야 할 가정

**현재 후보는 “SSG HTML까지 Worker 호출 0회” 조건을 충족하지 않는다.**

- JS/CSS/폰트/public 파일은 `run_worker_first: false`로 Worker를 우회한다.
- SSG HTML/RSC는 저장된 결과를 읽지만 요청 처리에 Worker가 실행된다.
- 최종 dry-run 번들은 gzip 4,656.65 KiB(약 4.55 MiB)다. [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/#worker-size)의 Free 3 MiB를 넘고 Paid 10 MiB 이내다.
- 현재 계정이 Free라면 번들 축소 또는 Paid 전환 결정이 필요하다. 요금제는 이번 작업에서 변경하지 않았다.
- 이미 Paid여도 요청·CPU 증가분은 별도로 측정해야 한다. “추가 비용 없음”으로 확정할 수 없다. [요금 기준](https://developers.cloudflare.com/workers/platform/pricing/)

원래 계획의 비용·호출 조건을 자동으로 완화하지 않는다. 요금제 확인과 이
차이에 대한 사용자 결정 전에는 원격 배포 및 운영 전환을 진행하지 않는다.

## 로컬 재검증

```sh
pnpm install --frozen-lockfile
pnpm cf:typegen
pnpm verify
pnpm workers:build
pnpm exec wrangler deploy --dry-run --config wrangler.worker.jsonc
pnpm exec wrangler d1 migrations apply DB --local --config wrangler.worker.jsonc
pnpm workers:preview --port 8792
```

다른 터미널에서:

```sh
pnpm workers:smoke http://localhost:8792
```

로컬 D1 변경까지 검사하려면 `--local-mutations`를 붙인다. 스크립트는 원격
호스트에 대한 mutation 실행을 거부한다. 이 테스트에는 테스트 전용 VAPID
설정과 구독자가 없는 로컬 DB를 사용한다. 실제 푸시 키·구독은 사용하지 않는다.

Workers AI는 로컬에서도 원격 리소스를 사용한다. 비용 없는 검증에서는
검색어가 있는 검색, 챗봇, 재인덱싱 API를 호출하지 않는다. 기본 smoke는 이를 피한다.
실제 secret은 `.dev.vars` 또는 Cloudflare secret으로 관리하고 git에 넣지 않는다.

## 승인 후 남은 순서

1. Workers 요금제와 SSG 호출 비용 조건 결정. 현재 Pages 요청·CPU 기준선 확보.
2. migration 브랜치 푸시 승인. **main 병합과 기존 Pages 자동 배포는 별도 단계**다.
3. 읽기 전용 `sw-blog-preview` Worker 배포 승인. Custom Domain은 지정하지 않는다.
4. Pages/Worker binding·secret 목록 대조. 런타임 secret 4개와 지도 public build 변수 2개를 구분한다.
5. 원격 Preview에서 noindex·쓰기 차단·SSG·RSC·API 조회·지도·CPU·번들 한도를 확인한다.
6. 별도 테스트 리소스를 쓰거나 승인한 테스트 레코드만 사용해 R2/Vectorize 쓰기, Claude streaming, Web Push를 확인한다. Preview의 쓰기 차단을 무작정 해제하지 않는다.
7. Workers Builds 또는 GitHub Actions 배포 방식을 확정하고, **성공한 commit의 배포 후에만** 재인덱싱하도록 현재 Pages polling workflow를 교체한다.
8. 확정된 preview hostname을 분석 리포트 제외 규칙에 반영한다. 현재 보고서/대시보드를 임의의 hostname으로 바꾸지 않는다.
9. 별도 승인 후 Pages 자동 배포를 중지하고 도메인을 전환한다. Pages 마지막 성공 배포는 보존한다.
10. 장애 시 도메인을 Pages로 돌리고, 최소 7일간 오류·CPU·요금·SEO를 비교한다.

운영 rollback 원천은 현재 main의 `a86aef4` 및 전환 직전 Pages production deployment다.
새 코드에는 Pages 빌드 스크립트가 없으므로 새 브랜치를 Pages에 재배포하는 것을
rollback으로 착각하지 않는다. DB·데이터 형식은 바꾸지 않았으므로 기존 Pages와 호환된다.
