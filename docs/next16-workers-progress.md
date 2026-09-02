# Next.js 16 · Workers 전환 진행 기록

> 2026-09-02: 단순 D1 API 5개와 일반 미등록 글의 404 문서를 Next.js 초기화에서 분리했다. 읽기 전용 Preview에서 통계 cache BYPASS CPU P50 1.550 ms, 개인별 좋아요 2.091 ms를 확인했다. 다만 첫 통계 요청의 CPU 표본이 없고, Next.js에 남긴 미디어 API에서 P99 276.033 ms가 관측돼 Workers Free 운영 전환은 계속 보류한다. 운영은 기존 Pages이며 Git 푸시·도메인 전환은 하지 않았다.

## 현재 결정

- Next.js 16.3.4 / React 19.2.8 / OpenNext Cloudflare 1.20.6 / Wrangler 4.128.0.
- 브랜치: `codex/next16-vinext`. 이름은 최초 계획을 유지하지만 실제 어댑터는 OpenNext다.
- 기존 D1/R2/Vectorize 리소스를 가리키는 `wrangler.worker.jsonc`를 별도로 만들었다.
- `wrangler.toml`과 운영 Pages project, 배포 자동화, 재인덱싱 workflow는 아직 유지한다.
- 새 코드에는 next-on-pages와 Edge runtime 선언이 없다. **이 브랜치를 기존 Pages 빌드로 배포하면 안 된다.**
- Cache Components, ISR, KV, 캐시용 R2, Durable Objects, Images, Workers Cache는 추가하지 않았다.
- 공개 통계 4개 URL에만 기존 Cache API의 30초 캐시를 적용했다. 별도 Workers Cache 제품 설정과 다르며, 적중해도 Worker invocation은 발생한다.
- 조회·좋아요·댓글·댓글 좋아요·참여 분석 API는 동일한 로직을 Worker에서 직접 호출한다. 일반 미등록 글의 HTML/HEAD 404도 직접 제공하며, 미등록 RSC·인코딩 경로·기타 API는 Next.js가 처리한다.
- 사용자가 Workers Free 사용을 확인했다. 유료 전환 없이 번들을 최적화했으며 요금제는 변경하지 않았다.

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
당시 KV를 추가하거나 vinext용 HTML/RSC 제공 계층을 만드는 대신, 최초 계획에 명시한
“SSG 호환성 차단 시 OpenNext” 조건을 적용했다. vinext 자체가 모든 SSG를
지원하지 않는다는 뜻이 아니라, **이 앱의 캐시 없는 기본 배포 경로**에서 확인한 문제다.

## 구현한 구성

`open-next.config.ts`는 공식 [SSG용 Static Assets 캐시](https://opennext.js.org/cloudflare/caching#ssg-site)를 사용한다.
빌드 결과는 `.open-next/assets/cdn-cgi/_next_cache`에 읽기 전용으로 보관된다.
`workers:preview`는 로컬 실행 전에 해당 캐시를 채운다. 단순 `wrangler dev`만
실행하면 이 준비 단계가 빠질 수 있으므로 지정된 스크립트를 사용한다.
후속 CPU 최적화에서는 immutable SSG의 응답별 파일도 빌드하며,
이 요청은 아래의 Static Assets 직접 스트리밍 경로를 사용한다.

- `getRequestContext()` → `getCloudflareContext()`.
- 알림의 `ctx.waitUntil`은 유지한다. Next route adapter는 OpenNext context를, Worker 직접 경로는 해당 요청의 `env`와 `ctx`를 전달한다.
- `next dev`는 `initOpenNextCloudflareForDev()`로 로컬 binding을 제공한다.
- `pnpm cf:typegen`으로 `cloudflare-env.d.ts`를 생성한다. Secret 값은 포함하지 않는다.
- `.workers.dev`와 Pages preview의 mutation API는 403으로 차단한다.
- HTML/API noindex와 프리뷰 쓰기 차단은 `src/worker.ts`, 정적 파일 noindex는 `public/_headers`가 담당한다. 공식 [Custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker) 방식으로 생성된 OpenNext handler를 호출한다. 실험적 Node.js proxy 경로는 제거했다.
- 이 요청 정책은 Cloudflare Worker 진입점에 있으므로 `next dev`가 아니라 `workers:preview`에서 검사한다.
- Free를 전제로 Paid용 `limits.cpu_ms: 1000` 설정을 제거했다. Free의 요청당 CPU 10 ms는 별도 검증이 필요하다.
- `minify: true`를 적용하고 CI에 `pnpm workers:check`를 추가했다. dry-run 업로드 번들의 gzip 크기가 3 MiB를 넘으면 실패하며 원격 업로드는 하지 않는다.

### Shiki 번들 최적화

- `src/lib/shiki.ts`는 현재 글의 13개 문법과 GitHub dark/light 테마만 포함한다. `text`는 별도 문법 없이 지원된다.
- Next.js가 Shiki를 외부 패키지로 남기지 않도록 `transpilePackages`에 추가하고, Turbopack·webpack 모두 기본 `shiki` import를 이 소형 번들에 연결한다. `rehype-pretty-code`의 내부 기본 import도 같은 경로를 사용한다.
- [Shiki JavaScript RegExp 엔진](https://shiki.style/guide/regex-engines#javascript-regexp-engine)으로 Oniguruma WASM을 제외했다. `forgiving` 옵션으로 오류를 숨기지 않는다.
- `src/lib/shiki.test.ts`는 MDX 26개 파일의 언어 지정 코드 블록 235개를 기존 전체 Shiki/Oniguruma 엔진과 비교한다. 양쪽 테마의 토큰·색상이 일치하며, 등록하지 않은 언어를 글에 추가하면 테스트에서 실패한다.
- 새 코드 언어가 필요하면 `src/lib/shiki.ts`에 추가하고 `pnpm verify`와 `pnpm workers:check`를 다시 실행한다.

| 단계 | gzip 크기 |
| --- | --- |
| 최적화 전 | 4,656.65 KiB (4.55 MiB) |
| 언어·테마 제한, 기존 WASM 엔진 | 3,366.08 KiB |
| 위 구성 + Wrangler minify | 2,982.07 KiB |
| JavaScript 엔진 + minify | 2,774.39 KiB (2.71 MiB) |
| 최종: 위 구성 + Custom Worker·MDX 번들 호환성 수정 | **1,663.66 KiB (1.62 MiB)** |

최초 대비 약 64% 감소했고 Free 3,072 KiB 한도까지 약 1,408 KiB가 남는다.
`workers:check`는 Wrangler의 multipart 산출물에서 source map과 metadata를 제외하고
추가 모듈 → entry point 순서로 gzip을 계산해 Wrangler 출력과 일치시킨다.
minify를 끈 3,160.97 KiB 후보가 검사에서 실패하는 것도 확인했다.

### 캐시 최적화 회귀 대응

처음 `enableCacheInterception: true`에서는 Next.js 16의 `/_tree` segment
prefetch에 전체 페이지 RSC가 반환되어 브라우저가 prefetch를 반복했다.
추가 조사에서 Next.js 16.3의 기본 `experimental.prefetchInlining` 설정이
OpenNext의 개별 segment 선택을 건너뛰게 하는 조건임을 확인했다.
`prefetchInlining: false`로 segment별 payload를 생성하도록 바꿨다.

그러나 cache interception만 켠 Preview(`ef07d25f-09eb-42ca-b60a-b1c91ca05121`)의
첫 홈 요청 CPU는 43.649 ms, 홈 반복 P50은 30.649 ms였다. 이전 첫 요청의
370.809 ms보다는 줄었지만 Free 기준에는 부족했다. 홈의 캐시 JSON은 약
2 MB이며 HTML·전체 RSC·모든 segment를 매번 파싱하고 응답 해시까지 계산했다.

`scripts/build-static-responses.mjs`가 OpenNext 빌드 뒤 200 응답인 immutable app 캐시만
HTML·전체 RSC·각 segment의 파일로 나눠 `.open-next/assets/cdn-cgi/_ssg`에
저장한다. 파일명은 빌드 시 계산한 SHA-256이며 같은 본문은 같은 파일을 쓴다.
`src/worker.ts`는 빌드 manifest에서 필요한 파일을 선택해 `ASSETS.fetch()`의
본문을 스트리밍한다. 요청 시 대형 JSON 파싱·응답 해시 계산·Next 서버 실행을
생략하며 별도의 저장소나 유료 서비스는 추가하지 않는다.

GET/HEAD의 알려진 정적 응답을 직접 처리하고 Draft cookie, Server Action,
재검증 요청, 미등록 segment와 아래에서 분리한 5개 이외의 동적 API는 기존 Next.js에 맡긴다.
`enableCacheInterception`은 `false`로 유지한다. `workers:smoke`가 HTML/전체
RSC/모든 segment의 빌드 결과 일치, HEAD/ETag 304/Range, 미등록 segment의
Next.js fallback을 검사한다. Vary·Content-Type·Preview noindex도 유지한다.
로컬 ASSETS에는 있던 ETag가 원격 HTML에서는 생략되는 차이도 확인했다.
Worker에서 weak/strong ETag를 직접 설정해도 HTML에서는 제거됐고, RSC의
ETag는 유지됐다. [Cloudflare의 HTML 변환 기능은 ETag를 제거할 수 있다](https://developers.cloudflare.com/cache/reference/etag-headers/).
정확히 어떤 edge 설정이 원인인지는 확정하지 않았다. 이 현상을 해결하지 못한
수동 ETag 코드는 제외했고, 기존 ASSETS의 validator 처리를 유지했다.
Smoke는 로컬 HTML과 원격 RSC의 ETag/304를 검사하며, 원격 HTML에서 ETag가
없으면 이를 명시적으로 보고한다. 브라우저의 원격 HTML 304 재검증은 미검증이며
별도 도메인·edge 설정 점검 대상으로 남긴다. 이 때문에 압축이나 운영 설정을
임의로 끄지는 않았다.

### 버그·경고 수정과 재검증

- R2 Range 요청: 파일 크기보다 큰 끝 위치를 실제 크기로 제한한다. 만족할 수 없는 범위는 R2 읽기 전에 416으로 응답한다. suffix·open-ended·빈 파일·잘못된 형식도 회귀 테스트한다. 실제 workerd에서는 응답이 chunked 전송되어 `Content-Length`가 생략될 수 있으므로 상태·`Content-Range`·실제 바이트를 함께 확인했다.
- 폴더 이름 변경: 중첩 `.order.json` 안의 파일 경로도 새 폴더 경로로 변경해 사용자 정렬을 유지한다. 페이지가 나뉜 R2 목록·동영상 포스터·충돌·삭제도 확인했다.
- 미등록 `/blog/<slug>`: `dynamicParams = false`로 빌드에서 생성하지 않은 글의 런타임 생성을 차단한다. 반복 404 요청이 `x-nextjs-cache: HIT`이며 읽기 전용 캐시 쓰기 오류가 없다. smoke는 홈·글 목록의 내용과 모든 검사 페이지의 캐시 HIT도 확인한다.
- Node.js proxy experimental: 요청 정책을 Custom Worker로 옮겨 실험 경로를 제거했다. Pages canonical redirect·preview noindex·mutation 403을 단위 테스트와 로컬 HTTP로 확인했다.
- MDX 의존성 `Failed to copy`: OpenNext의 문자열형 `exports` 처리에 고정 버전 패치를 적용했다. 문자열 export 보존과 workerd 조건 변환을 테스트한다.
- direct eval: 사용하지 않는 `gray-matter`의 JavaScript frontmatter 평가 엔진을 제거했다. YAML/JSON frontmatter와 25편의 SSG는 유지하며 JS frontmatter는 명시적으로 거부한다.
- 중복 object key: `oniguruma-to-es`의 옵션 결합을 동일한 순서의 `Object.assign`으로 바꿨다. 전체 코드 블록·양쪽 테마 토큰 비교를 다시 통과했다.
- Vite의 ESM/CJS 로더 경고: Vitest 설정 확장자를 `.mts`로 변경했다.

고정 버전 의존성 패치의 적용 이유와 제거 기준은 [patches/README.md](../patches/README.md)에 기록했다.
`pnpm verify`, Workers build, dry-run에서 위 빌드 경고가 재발하지 않았다.

경고가 모든 실행 환경에서 0개라는 뜻은 아니다. 로컬 preview는 AI의 원격 실행·Vectorize의 로컬 미지원·테스트용 secret 미설정을 안내한다.
이를 숨기려고 원격 binding이나 실제 secret을 추가하지 않았다. 새 의존성 해석 시 표시된 기존 transitive deprecated 패키지와 `eslint-plugin-react`·Tailwind typography의 peer 경고도 별개로 남아 있다. 확정된 lockfile의 `pnpm install --frozen-lockfile`은 통과한다.

### 별도 항목 후속 검증 (2026-09-02)

코드 기준 `3bb70ff`. 이번에는 검증만 진행했으며 의존성·운영 데이터·Cloudflare 설정을 변경하지 않았다.

#### 의존성

- `pnpm verify`: 100개 테스트와 MDX 26개 검사 재통과.
- 임시 사본에서 frozen lockfile 신규 설치는 통과했다. 캐시된 설치 판정을 끄고 의존성을 다시 해석하면 deprecated 4개와 peer 경고가 재현된다. `--strict-peer-dependencies`는 ESLint 조건에서 실패한다. frozen 설치 성공만으로 peer 호환성이 보장되지는 않는다.
- `pnpm audit --prod`: 알려진 취약점 0건. 개발 의존성 포함 감사는 moderate 1건이다. `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild@0.18.20` 경로이며, [esbuild 개발 서버 CORS 취약점](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)에 해당한다. 확인한 loader는 `transform`/`transformSync`를 사용하므로 이 경로에서 취약한 `serve` 기능 사용은 확인되지 않았다. 운영 취약점과 구분하되 제거 후보로 남긴다.
- `eslint-plugin-react@7.37.5`의 peer는 ESLint 9까지만 선언되어 ESLint 10.5.0과 불일치한다. 현재 활성화한 유일한 React 규칙 `button-has-type`은 정상·누락·잘못된 type 세 경우에서 기대대로 동작했다. 전체 플러그인의 호환성을 보장하는 검사는 아니다. [ESLint 9는 2026-08-06에 지원이 종료](https://eslint.org/version-support/)됐으므로 경고만 없애기 위한 다운그레이드는 권하지 않는다.
- `@tailwindcss/typography@0.5.20`의 `>=3.0.0 || >=4.0.0 || insiders`는 `insiders` 때문에 표준 semver 범위로 파싱되지 않는다. stable 범위만 평가하면 Tailwind 4.3.1이 충족한다. `pnpm peers check`는 이를 경고하지만 새 resolver의 strict 설치 실패 원인은 ESLint였다. [동일한 upstream 범위 표기 이슈](https://github.com/tailwindlabs/tailwindcss-typography/issues/325)가 있다.
- deprecated 4개는 `drizzle-kit`의 `@esbuild-kit` 2개, OpenNext AWS 빌드 도구의 `glob@9.3.5`, OpenNext Cloudflare SDK의 `node-domexception@1.0.0`이다. 최신 stable 상위 패키지에서도 해당 경로가 남아 있다. 경고를 일괄 숨기거나 검증 없이 transitive major 버전을 강제하지 않았다.

#### 원격 리소스·인덱스 (읽기 전용)

- Wrangler 인증과 운영 Pages project를 확인했다. 운영 D1 `sw-blog-db`, R2 `sw-blog-media`, AI, Vectorize 두 개의 이름/ID는 Workers 후보 설정과 일치한다. 운영 secret 이름 6개도 확인했으며 값은 출력하지 않았다. 런타임 secret 4개와 지도용 build 변수 2개다.
- Workers AI 모델 목록에 `@cf/baai/bge-m3`가 있다. 두 Vectorize 인덱스는 1024차원/cosine이며 `blog-search` 25개, `rag-chunks` 77개다. 추론·유사도 검색·Claude 호출·실제 알림은 실행하지 않았다.
- 운영 `search-index.json` 25개와 `rag-chunks.json` 76개는 로컬 산출물과 내용까지 일치한다.
- **RAG 잔존 벡터 1개를 확인했다.** 전체 ID를 비교하면 누락은 없고 `nextjs-bundle-splitting-3`만 현재 청크에 없다. R2 `.rag-vector-ids.json`도 현재 76개만 추적하므로 기존 재인덱싱의 manifest 차집합만으로는 이 벡터를 삭제할 수 없다. 검색 topK에 들어오면 본문 매핑 단계에서 버려져 유효한 참고 자료가 줄 수 있다. 정확한 ID 정리와 인덱스/manifest 대조 방식 보완이 필요하며 아직 삭제하지 않았다.
- 구형 Pages **preview**에는 운영 bindings 대신 `NEXT_PUBLIC_NOTION_DB_ID`, `NEXT_PUBLIC_NOTION_TOKEN` 일반 변수가 남아 있다. 현재 소스에서는 사용하지 않는다. 실제 토큰인지, 유효한지, 과거 클라이언트 번들에 노출됐는지는 이번에 확인하지 않았다. Workers 설정으로 복사하지 말고 별도 제거·키 점검 대상으로 둔다.

#### 당시 미실행 항목 (아래 Preview 배포 기록으로 일부 갱신)

- Cloudflare API가 `sw-blog-preview`에 대해 Worker 미존재(`10007`)를 반환했다. 따라서 원격 CPU 수치를 측정할 배포 대상이 없다. Preview Worker 최초 배포 승인 후 검사해야 한다. Git 푸시나 운영 도메인 변경은 필요하지 않다.
- [Workers AI와 Vectorize는 로컬 시뮬레이션을 제공하지 않는다](https://developers.cloudflare.com/workers/local-development/#recommended-remote-bindings). 안내를 없애는 설정 변경은 실제 원격 접근을 허용하므로 자동으로 적용하지 않았다.
- 원격 Preview의 CPU·지도 도메인 제한, AI/Claude 실제 응답, R2/Vectorize 쓰기, 실기기 알림, 도메인 rollback은 여전히 미검증이다. 이번 리소스 메타데이터 조회를 기능 end-to-end 통과로 취급하지 않는다.

### 읽기 전용 Preview 배포 (2026-09-02)

사용자가 Preview 배포를 승인했다. 애플리케이션 코드 기준은 `e650345`이며,
운영 Pages나 Git 원격 브랜치는 변경하지 않았다.

- URL: <https://sw-blog-preview.starhn87.workers.dev>
- Worker version: `6e2e2690-be58-40db-928c-30fa3b160e48`.
- 배포 전 `pnpm verify`(100개 테스트), `pnpm workers:build`, `pnpm workers:check` 통과.
- OpenNext deploy로 SSG 캐시를 Static Assets에 채운 뒤 업로드했다. gzip 1,663.27 KiB, 배포 로그의 startup 30 ms. startup은 요청당 CPU와 다른 값이다.
- 운영 D1/R2/AI/Vectorize binding 이름은 유지하되 런타임 secret은 배포하지 않았다. 원격 설정에서 secret binding이 없는 것도 확인했다. Custom Domain·요금제·저장형 로그 설정은 변경하지 않았다.
- Free 유지 조건은 앞선 사용자 확인을 기준으로 한다. 구독 목록 API는 현재 OAuth 권한으로 403이어서 청구 요금제를 독립적으로 재확인하지 못했다. Worker의 `usage_model: standard`만으로 Free/Paid 여부를 판단하지 않는다.
- OpenNext가 `.env.local`을 `.open-next/cloudflare/next-env.mjs`에 포함하므로, 이번 Preview의 생성된 환경변수 모듈은 `NEXT_PUBLIC_` 항목만 남겼다. 별도 ignored Preview 설정에서 `secrets.required`도 비웠다. 최종 배포 번들·정적 자산·SSG 캐시에서 관리자/Claude/VAPID 비공개 키가 없음을 검사했다. 원본 `.env.local`은 변경하지 않았다.
- 이 조치는 **이번 생성물에만** 적용했다. 다음 build는 환경변수 모듈을 다시 생성하므로, 재배포 전 같은 검사를 반복하거나 비공개 키가 없는 격리 빌드를 사용해야 한다. 운영 전환 시 필요한 키는 Worker secret으로 별도 주입한다.

원격 검증:

- 게시글 25편, 홈·글 목록·태그·about·admin의 HTML 및 SSG cache HIT, canonical, RSS/sitemap/robots, 반복 404, RSC segment tree, D1 조회와 인증 거부를 확인했다.
- 10개 API의 POST와 댓글 API의 PUT/PATCH/DELETE는 모두 `403 Preview is read-only`였다. HTML·API·정적 파일 모두 Preview noindex를 확인했다. 조회수·분석 이벤트도 기록하지 않는다.
- 기존 R2 썸네일의 32바이트 범위 읽기, suffix, 파일 끝을 넘는 범위 제한, 불가능한 범위의 416을 실제 binding에서 확인했다. 업로드·수정·삭제는 실행하지 않았다.
- 브라우저에서 홈 → PostGIS 이동, 히어로/본문/코드 11블록, canonical, 라이트/다크 전환을 확인했다. 390px 모바일 화면의 가로 넘침과 수집된 page error는 없었다.
- AI 추론·검색어 있는 검색·Claude streaming·실제 알림·지도 API는 호출하지 않았다. 읽기 전용 Preview 통과를 이 기능들의 원격 end-to-end 검증으로 해석하지 않는다.
- 운영 URL은 여전히 200이며 noindex가 없다. Pages production deployment `87ceefa2-05e4-477e-bc82-2f66cd80c914`, commit `a86aef43f3997c0dc0f32c0b98287f749515162f`와 기존 도메인 3개가 그대로다.

CPU 판단은 Cloudflare GraphQL `workersInvocationsAdaptive`의 `cpuTimeP50/P95/P99`를
사용했다. 스키마의 단위는 microseconds이므로 문서에서는 1,000으로 나눠 ms로
표기한다. 첫 홈 요청은 CPU **370.809 ms**였다. 성공 응답과 cache HIT만으로
Free 적합성을 판단할 수 없다는 것이 실제로 확인됐다.

브라우저를 닫고 홈·PostGIS·미등록 글·조회 API·정적 파일을 각각 20회씩 순차
요청했다. 각 유형의 측정 창을 분리했으며, GraphQL의 adaptive sampling 때문에
집계 요청 수는 실제 보낸 20회와 일치하지 않을 수 있다. 아래 CPU는 해당 창의
추정 분위수이며 지역·트래픽·isolate 상태 전체를 대표하는 보장은 없다.

| 유형 (실제 요청 수) | CPU P50 | CPU P95 | CPU P99 |
| --- | ---: | ---: | ---: |
| 첫 홈 요청 (1회) | 370.809 ms | 370.809 ms | 370.809 ms |
| 홈 반복 (20회) | 28.410 ms | 32.649 ms | 250.058 ms |
| PostGIS 반복 (20회) | 11.562 ms | 22.498 ms | 22.498 ms |
| 미등록 글 404 반복 (20회) | 4.484 ms | 5.772 ms | 40.901 ms |
| `/api/views` 조회 반복 (20회) | 4.804 ms | 43.642 ms | 43.642 ms |
| `/logo.svg` 정적 파일 (20회) | Worker invocation 관측 없음 | — | — |

측정 창은 UTC 기준 첫 요청 `11:55:15–11:55:18`, 홈 `11:58:22–11:58:30`,
글 상세 `11:58:30–11:58:36`, 404 `11:58:36–11:58:41`, 조회 API
`11:58:42–11:58:50`, 정적 파일 `11:58:51–11:58:55`다. 종료 시각은 exclusive로
조회했다. 12:00 UTC 조회 기준이며 첫 요청/반복 표본은 LAX에서 처리됐다.
반복 요청도 항상 같은 warm isolate에서 실행됐다고 보장할 수 없다.
HTTP 응답은 모두 기대한 200/404였고 이 측정 창에서 집계된 실행 오류는 0건이다.

**결론: 기능은 동작하지만 Workers Free 운영 전환의 CPU 기준은 통과하지 못했다.**
[공식 한도](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)는 Free
HTTP 요청당 10 ms이며, 간헐적 초과에는 여유가 있어 오류 없이 완료될 수 있다.
따라서 `exceededCpu`가 없다고 안전하다는 뜻은 아니다. 유료 전환이나 도메인
이동으로 우회하지 않고, SSG 요청의 런타임 CPU를 낮추는 후속 작업이 먼저다.

### SSG CPU 최적화 후 Preview 재검증 (2026-09-02)

애플리케이션 코드 `c30da10`, 최종 Worker version
`fa1903b3-f342-4b02-bb44-3715521ed937`다. 동일한 읽기 전용 Preview에만
적용했으며 gzip 1,670.84 KiB, startup 38 ms였다. 30개의 정상 immutable app
경로가 응답별 Static Assets로 생성됐다. 오류 페이지·API·미등록 경로는
Next.js 처리를 유지한다.

수동 ETag를 추가한 후보 두 개는 원격 HTML ETag 제거 문제를 해결하지 못했다.
해당 코드를 제외해 검증된 SSG 구성을 복원한 뒤, 오류 페이지를 제외한 최종
버전을 배포했다. D1/R2/Vectorize 데이터는
변경하거나 되돌리지 않았으며, 새 저장소·secret·도메인·요금제 설정은 추가하지 않았다.

최종 채택 버전의 첫 홈 1회와 유형별 20회 측정 결과다. 기존 측정과 같은
GraphQL 필드·단위·집계 방식을 사용했으며, 아래 값은 12:29 UTC 조회 기준이다.

| 유형 (실제 요청 수) | CPU P50 | CPU P95 | CPU P99 |
| --- | ---: | ---: | ---: |
| 배포 후 첫 홈 (1회) | 0.775 ms | 0.775 ms | 0.775 ms |
| 홈 반복 (20회) | 0.314 ms | 0.354 ms | 0.389 ms |
| PostGIS 반복 (20회) | 0.327 ms | 0.365 ms | 0.365 ms |
| PostGIS RSC tree (20회) | 0.303 ms | 0.415 ms | 0.415 ms |
| 미등록 글 404 (20회) | 3.360 ms | 6.360 ms | 224.350 ms |
| `/api/views` 조회 (20회) | 4.964 ms | 6.698 ms | 42.520 ms |
| `/logo.svg` 정적 파일 (20회) | Worker invocation 관측 없음 | — | — |

측정 창은 UTC 첫 홈 `12:27:53–12:27:55`, 홈 `12:27:55–12:28:02`,
글 `12:28:02–12:28:08`, RSC `12:28:08–12:28:13`, 404 `12:28:13–12:28:18`,
API `12:28:19–12:28:26`, 정적 파일 `12:28:27–12:28:31`이며 종료는 exclusive다.
모두 PDX에서 응답했고 HTTP 상태는 기대한 200/404, 집계 실행 오류는 0건이다.
Adaptive sampling 때문에 추정 요청 수는 실제 요청 수와 다를 수 있다.
제한된 표본이므로 모든 지역·페이지·cold start의 상한을 보장하지 않는다.

최초 LAX 표본과 최종 PDX 표본을 비교하면 첫 홈 CPU는 370.809 → 0.775 ms,
반복 홈 P50은 28.410 → 0.314 ms다. 지역이 달라 엄밀한 동일 환경 비교는 아니다.
오류 페이지 제외 전의 동일한 SSG 스트리밍 버전(`4dd4f65f`)을 LAX에서 측정했을
때도 첫 홈 1.066 ms, 홈 P50 0.501 ms, PostGIS P50 0.436 ms였다.
**SSG 표본의 CPU는 크게 개선됐지만 전체 Free 운영 전환 판정은 여전히 미통과다.**
동적 API와 미등록 경로의 Next.js 초기화·라우팅 비용을 분리해서 검증하고,
원격 HTML ETag 제거와 운영 도메인의 재검증 동작도 별도로 점검해야 한다.

최종 배포 후 25편·SEO·HTML/RSC 분리·각 segment·HEAD·Range·RSC 304·
API 읽기를 다시 통과했다. 원격 HTML ETag 누락은 smoke가 별도 경고하며 통과로
간주하지 않는다. 비공개 키가 없는 번들/자산 검사와 Preview mutation 403도
확인했다. 운영 Pages의 deployment·commit·도메인 3개는 그대로다.
브라우저에서 홈 → PostGIS, 히어로·코드 11블록·canonical을 확인했고 390px
화면에서 가로 넘침이나 page error는 없었다.

### RSC·통계 캐시 최적화와 전환 판정 (2026-09-02)

추천 순서대로 구현하고 다음 다섯 최소 단위 커밋으로 나눴다. 애플리케이션 기준은
`665d55d`, Worker version은 `f300aca3-be2a-4f03-9198-e56c11d92fb2`,
build ID는 `yel7sXHSxdKdZ5XA5K1RE`다. 읽기 전용 Preview에만 배포했고
gzip 1,672.69 KiB, startup 27 ms였다. startup은 아래 요청당 CPU와 다른 값이다.

1. `66507e2`: `PostSummary`와 `getPostSummaries()`로 목록에는 메타데이터만 전달한다. MDX 본문 전체가 Client Component props와 RSC에 실리는 경로를 제거했다. 상세 글은 기존 서버 렌더링을 유지한다.
2. `b5fb775`: 조회·주간 조회·좋아요·댓글 집계를 클라이언트 모듈에서 60초 공유하고 진행 중인 요청도 합친다. 정렬 효과의 데이터 의존성 루프를 제거했다. 성공한 mutation은 해당 통계를 무효화하고 다음 요청에 `cache: "reload"`를 사용한다. 실패 응답과 검증에 실패한 집계는 캐시에 남기지 않는다.
3. `44cc42d`: 현재 홈/About의 자기 경로 prefetch를 끄고, 태그는 hover/focus 후에만 미리 읽는다. 게시글 링크의 기본 prefetch와 `experimental.prefetchInlining: false`는 유지한다.
4. `ac2a5aa`: `/api/views`, `/api/views?days=7`, `/api/likes`, `/api/comments`의 공개 GET만 Next.js 진입 전에 Cache API로 처리한다. 개인별·인증·RSC·재검증·알 수 없는 쿼리는 공유 캐시에서 제외한다. 개인별 좋아요·댓글 응답은 `private, no-store`다.
5. `665d55d`: 홈 정렬과 검색창의 `useSearchParams`만 작은 Suspense 경계에 둬 카드가 초기 HTML에 포함되도록 수정했다. 정렬은 native `history.replaceState`와 클라이언트 상태로 처리해 홈 RSC를 다시 요청하지 않는다.

마지막 항목은 검증 중 발견했다. 기존 홈과 글 목록은 광범위한 Suspense/CSR
bailout으로 실제 `<article>`과 글 링크가 서버 HTML에 없었다. 이전 smoke는
직렬화된 MDX 본문 안의 URL을 실제 링크로 오인했다. URL 문자열 존재 검사를
실제 `href`와 `<article>` 개수 검사로 강화했고, 최종 홈은 5개·목록은 25개의
카드를 서버 HTML에 포함한다. 정렬 query로 직접 들어오면 초기 SSG는 최근순이며,
클라이언트가 URL의 정렬을 적용한다.

#### 전송량과 캐시의 범위

아래는 같은 로컬 gzip 방식으로 계산한 빌드 파일 크기다. 이번 작업 직전의
SSG 스트리밍 버전과 비교하며, 전체 JS 번들 감소나 LCP 측정값은 아니다.

| 응답 | 이전 gzip | 최종 gzip |
| --- | ---: | ---: |
| 홈 HTML | 157,004 bytes | 15,213 bytes |
| 홈 전체 RSC | 149,831 bytes | 9,293 bytes |
| 글 목록 HTML | 154,208 bytes | 17,761 bytes |
| 글 목록 전체 RSC | 149,492 bytes | 8,921 bytes |
| 태그 전체 RSC | 9,321 bytes | 9,320 bytes |

홈 HTML은 약 90%, 홈 RSC는 약 94% 줄었다. 원격 브라우저에서 받은 홈 HTML도
decoded 78,425 / encoded 15,201 bytes로 확인했다. 25편 전체 본문 대신
메타데이터만 넘기는 것이 핵심이며, 이미 요약 정보만 포함하던 태그 RSC에는
유의미한 크기 변화가 없다.

통계 캐시는 실시간 구독이 아니다. 일반 조회는 edge 30초와 client 60초가
겹치면 약 90초 전의 집계를 재사용할 수 있고, 화면을 계속 열어 두었다고
자동 갱신하지 않는다. 본인이 변경한 통계는 다음 소비 시 양쪽 캐시를 건너뛴다.
다른 방문자·리전의 캐시까지 전역 삭제하지는 않는다.
[Cache API는 데이터센터마다 독립적이며 적중에도 Worker가 실행된다](https://developers.cloudflare.com/workers/runtime-apis/cache/).
키에는 host와 허용된 경로/쿼리만 포함하고 visitor cookie는 넣지 않는다.
개인별 응답, `Set-Cookie`, `private/no-store`, 알 수 없는 `Vary`, 오류 응답은
공유 캐시에 저장하지 않는다. KV/R2/DO 같은 추가 저장소는 만들지 않았다.

#### 원격 CPU

배포 뒤 다른 Preview 검사 전에 측정했다. GraphQL `workersInvocationsAdaptive`
분위수를 1,000으로 나눠 ms로 표기한다. 12:55 UTC 조회 기준이며 모든 측정
요청은 LAX에서 응답했다. 각 반복 요청은 실제 20회지만 adaptive sampling의
추정 요청 수는 16/17회 등으로 다를 수 있다. 특정 isolate의 cold/warm 상태나
모든 지역의 상한을 보장하는 측정은 아니다.

| 유형 | CPU P50 | CPU P95 | CPU P99 |
| --- | ---: | ---: | ---: |
| 배포 후 첫 홈 (1회) | 1.445 ms | 1.445 ms | 1.445 ms |
| 배포 후 첫 `/api/views` MISS (1회) | **359.548 ms** | 359.548 ms | 359.548 ms |
| `/api/views` HIT (20회 모두 HIT) | 0.562 ms | 0.709 ms | 0.709 ms |
| 홈 (20회) | 0.571 ms | 0.700 ms | 0.853 ms |
| PostGIS (20회) | 0.553 ms | 0.843 ms | 4.833 ms |
| PostGIS RSC tree (20회) | 0.585 ms | 0.785 ms | 0.785 ms |
| `/api/views` no-cache BYPASS (20회) | 5.673 ms | 11.189 ms | 11.189 ms |
| 개인별 좋아요 GET (20회) | 5.562 ms | 9.342 ms | 13.153 ms |
| 미등록 글 404 (20회) | 3.918 ms | 8.169 ms | 8.169 ms |
| `/logo.svg` (20회) | Worker invocation 관측 없음 | — | — |

측정 창은 UTC 첫 홈 `12:52:50–12:52:51`, 첫 통계 `12:52:52–12:52:54`,
통계 HIT `12:52:54–12:52:58`, 홈 `12:52:59–12:53:03`,
글 `12:53:04–12:53:09`, RSC `12:53:09–12:53:13`,
통계 BYPASS `12:53:14–12:53:21`, 개인별 GET `12:53:21–12:53:32`,
404 `12:53:32–12:53:37`, 정적 파일 `12:53:37–12:53:41`이다. 종료는 exclusive다.
HTTP 상태는 기대한 200/404였고 집계된 실행 오류는 0건이다.

**전환 판정: Next.js 16/OpenNext의 읽기 경로는 동작하지만 Workers Free 운영
전환은 여전히 보류한다.** 캐시가 Next.js 실행을 생략하는 경로는 저렴하지만,
MISS와 개인별 API의 Next.js 처리 비용이 남는다. 정확한 내부 CPU 분해는 별도
프로파일링 대상이다. [Free의 요청당 CPU 한도는 10 ms](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)이므로
평균·cache HIT·오류 0건만으로 통과 처리하지 않는다. 이번 warm 404 표본이
10 ms 아래였어도 직전 배포의 초기화 비용 초과가 해소됐다는 증거는 아니다.

다음 최적화 후보는 단순 D1 API와 미등록 경로를 Next.js 초기화에서 분리하는 것이다.
단, 인증·쿠키·mutation·알림 후처리를 보존해야 하므로 이번 공개 캐시 변경에
무리하게 포함하지 않았다. Cache Components/ISR/PPR을 추가해도 이 초기 동적
요청 비용을 자동으로 해결하지 않는다. 실제 AI/Claude/Vectorize/알림, 지도 도메인,
운영 secret 주입, 배포·재인덱싱 CI, rollback 검증도 전환 전에 남아 있다.

#### 기능·안전성 검증

- `pnpm verify`: 14개 파일 160개 테스트, MDX 26개 alt 검사 통과. 빌드와 Free 용량 검사도 통과했다.
- 원격 smoke: 25편, 실제 홈/목록 카드, SEO, HTML/전체 RSC/segment 일치, HEAD·Range·RSC 304, 통계 HIT/BYPASS와 개인 응답의 비공개 정책 통과. 원격 HTML ETag 누락은 이전과 같은 명시적 경고이며 미해결이다.
- 브라우저: 초기 공개 통계는 세 번만 조회한다. 조회순·좋아요순 변경은 추가 통계 요청 0회, 주간 인기는 해당 집계 1회였고 홈 RSC 재요청은 없었다. 새로 보이는 글의 prefetch는 유지한다.
- 초기 홈에서 자기 홈/태그 prefetch는 없고 글/About prefetch는 유지됐다. 태그에 focus를 주면 해당 태그를 미리 읽으며 태그 이동·뒤로 가기 후 정렬 복원·정렬 URL 직접 진입도 통과했다.
- 390px 홈/글/목록에서 가로 넘침이 없고 PostGIS 히어로, 코드 11블록, canonical, 검색창 자동 focus를 확인했다. 브라우저 page error는 없으며 검색어 있는 API/AI는 호출하지 않았다.
- 로컬 좋아요 변경 후 목록으로 복귀하면 `/api/likes`가 `cache: "reload"`로 요청되고 1이 표시됐다. 다시 해제해 0/미선택으로 정리했다. 실제 알림은 발송하지 않았다.
- 공개 통계에 개인별 상태가 섞이지 않도록 서로 다른 방문자 cookie의 좋아요 GET이 `private, no-store`, 공유 캐시 헤더 없음, `liked: false`임을 확인했다. 원격 데이터 쓰기는 차단 상태다.
- 캐시 만료: 초기 CLI 검사 두 번은 중간에 colo가 바뀌어 만료 증거로 채택하지 않았다. 브라우저에서 PDX의 공개 댓글 집계가 HIT이고 32초 뒤 같은 PDX에서 MISS가 되는 것을 확인했다.
- 로컬 후처리 로그도 별도로 확인했다. 첫 실행은 테스트 VAPID 키가 없어 저장 후 알림 처리의 `JSON.parse`가 실패했다. 구독 0건을 확인하고 임시 P-256 테스트 키/subject를 넣어 재검사했다. 임시 config 위치 변경에 따른 빈 로컬 DB 참조도 `--persist-to`로 기존 로컬 state 경로를 명시해 바로잡았다. 최종 D1 mutation·정리 smoke와 서버 로그는 오류 없이 통과했다. 이는 실제 알림 발송 검증은 아니다. 로컬 AI/Vectorize 미지원 안내는 유지한다.
- 재배포 전 생성된 환경 모듈은 다시 public 변수만 남겼다. 배포 번들·자산·SSG 캐시 283개 파일에서 비공개 키가 없음을 검사했다. 원격 binding에는 AI/ASSETS/DB/MEDIA/Vectorize 두 개만 있고 secret과 Custom Domain은 없다.
- 운영 Pages의 deployment `87ceefa2-05e4-477e-bc82-2f66cd80c914`, commit `a86aef43f3997c0dc0f32c0b98287f749515162f`, 도메인 3개는 그대로이며 운영 응답은 200/noindex 없음이다. Git 푸시·운영 전환·요금제 변경은 하지 않았다.

### D1 API 직접 실행과 미등록 글 404 최적화 (2026-09-02)

애플리케이션 커밋은 `0f1831a`, `de9fbd7`, 원격 smoke 보강은 `a971216`이다.
Preview version은 `97b5d6d1-afbb-489b-ba9f-e1ea2c6c301e`, build ID는
`jzkHTEerEmX1H-dPMOFt5`다. gzip 1,698.95 KiB, startup 37 ms로 용량 검사를
통과했다. startup은 요청당 CPU 측정값이 아니다. 읽기 전용 Preview만 재배포했다.

#### 처리 경로와 보존한 동작

- `/api/views`, `/api/likes`, `/api/comments`, `/api/comments/likes`, `/api/analytics`의 구현을 `src/lib/api/`로 옮겼다. Worker가 요청의 `env`·`ctx`를 직접 전달하며, Next 개발 서버도 얇은 route adapter를 통해 같은 함수를 호출한다.
- 기존 구현과 컨텍스트 획득·함수 인자만 제외하고 비교해 5개 모두 동일함을 확인했다. SQL, visitor cookie, 비밀번호 확인, 알림 조건과 `waitUntil`은 변경하지 않았다. 인증 상태나 D1 인스턴스를 전역에 저장하지 않는다.
- HEAD는 GET과 같은 헤더·상태에서 본문만 제외하고, OPTIONS/405는 기존 Next 동작을 보존한다. 처리 중 오류는 비공개 500으로 종료한다. 실패한 mutation을 Next에 재전달해 중복 실행하지 않는다.
- 공개 집계의 30초 캐시와 개인별 좋아요·댓글의 `private, no-store`는 유지한다. `X-API-Runtime: worker`로 직접 처리 여부를 확인할 수 있다. Preview mutation 403은 API 실행보다 먼저 적용된다.
- 정적 manifest에 `/_not-found`의 404 응답만 추가해 31개 경로를 생성한다. 존재하지 않는 `/blog/[a-z0-9-]+` 일반 문서·HEAD 요청만 이 파일로 응답한다. 404 상태와 noindex, 비공개 no-store를 유지하고 조건부 요청이 304로 바뀌지 않게 한다.
- 인코딩·trailing slash·미등록 RSC·Draft·Server Action과 다른 미등록 URL은 계속 Next.js가 판단한다. `/blog/tag`와 실제 게시글은 기존 정상 경로다. 미디어·검색·챗봇·관리·구독 API는 이번 직접 처리 대상이 아니다.

#### 원격 CPU 재측정

배포 후 smoke·브라우저 검사 전에 순차 GET을 실행했다. 모두 PDX 응답이며,
13:18:48 UTC에 조회한 동일 version의 `workersInvocationsAdaptive` 결과다.
분위수 원본은 microseconds이므로 1,000으로 나눴다. 아래 `실제 / 추정`은
직접 보낸 요청 수와 Cloudflare adaptive sampling의 `sum.requests`다.

| 유형 | 실제 / 추정 요청 수 | CPU P50 | CPU P95 | CPU P99 |
| --- | ---: | ---: | ---: | ---: |
| 첫 `/api/views` MISS | 1 / 관측 없음 | 미확인 | 미확인 | 미확인 |
| `/api/views` HIT | 20 / 20 | 0.717 ms | 0.772 ms | 0.772 ms |
| 첫 개인별 좋아요 GET | 1 / 1 | 4.416 ms | 4.416 ms | 4.416 ms |
| 첫 개인별 댓글 GET | 1 / 1 | 3.163 ms | 3.163 ms | 3.163 ms |
| 첫 참여 분석 GET | 1 / 1 | 6.824 ms | 6.824 ms | 6.824 ms |
| 첫 미등록 글 HTML 404 | 1 / 1 | 0.995 ms | 0.995 ms | 0.995 ms |
| `/api/views` no-cache BYPASS | 20 / 18 | 1.550 ms | 4.313 ms | 4.313 ms |
| 개인별 좋아요 GET | 20 / 15 | 2.091 ms | 4.548 ms | 4.548 ms |
| 개인별 댓글 GET | 20 / 26 | 2.171 ms | 2.678 ms | 2.678 ms |
| 참여 분석 GET | 20 / 22 | 2.522 ms | 4.020 ms | 4.020 ms |
| 미등록 글 HTML 404 반복 | 20 / 1 | 0.698 ms | 0.698 ms | 0.698 ms |
| 홈 | 20 / 21 | 0.608 ms | 0.624 ms | 0.880 ms |
| PostGIS RSC tree | 20 / 12 | 0.724 ms | 0.807 ms | 0.807 ms |
| 첫 미등록 글 RSC 404 (Next) | 1 / 관측 없음 | 미확인 | 미확인 | 미확인 |
| 미등록 글 RSC 404 반복 (Next) | 20 / 20 | 6.312 ms | 13.226 ms | 13.429 ms |
| `/api/media?list=1` 인증 거부 (Next) | 20 / 25 | 7.229 ms | 9.021 ms | **276.033 ms** |

측정 창은 UTC 첫 통계 `13:13:57–13:13:59`, HIT `13:13:59–13:14:03`,
첫 좋아요 `13:14:04–13:14:05`, 첫 댓글 `13:14:06–13:14:07`,
첫 분석 `13:14:07–13:14:09`, 첫 404 문서 `13:14:09–13:14:11`,
BYPASS `13:14:11–13:14:18`, 좋아요 `13:14:18–13:14:29`,
댓글 `13:14:30–13:14:37`, 분석 `13:14:37–13:14:44`,
404 문서 `13:14:44–13:14:49`, 홈 `13:14:49–13:14:54`,
RSC tree `13:14:54–13:14:58`, 첫 Next fallback `13:14:59–13:15:01`,
Next fallback 반복 `13:15:01–13:15:05`, 미디어 `13:15:36–13:15:41`이다.
종료는 exclusive이며 측정 대상의 HTTP 상태는 200/404/401, 집계 실행 오류는 0건이다.

첫 통계·첫 Next fallback은 HTTP 응답을 확인했지만 CPU 집계가 없었다.
전후 1초 단위 창을 추가 조회해도 해당 표본은 찾지 못했다. 관측 없음은 0 ms나
한도 통과가 아니다. 반복 404 문서도 집계된 표본이 1건뿐이므로 분포를 일반화하지
않는다. 미디어 측정은 처음에 `?list=1`을 빠뜨려 정상적인 400 응답을 받았다.
측정 URL만 고쳐 별도 창에서 20회를 다시 실행했으며 기존 첫 요청 창은 덮어쓰지 않았다.

직전 LAX 표본과 비교하면 통계 BYPASS P50은 5.673 → 1.550 ms,
개인별 좋아요는 5.562 → 2.091 ms다. 코드·응답 헤더로 Next 실행 생략을 확인했고
반복 CPU도 줄었지만 지역이 달라 엄밀한 동일 환경 비교는 아니다. 첫 요청이나
모든 지역·mutation까지 10 ms 이내라고 보장하지 않는다.

**운영 전환 판정은 여전히 보류한다.** 이번 API 읽기 표본은 개선됐지만,
Next에 남긴 RSC 404와 미디어 API는 [Free CPU 10 ms 기준](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)을
초과했다. 초기화 비용이 원인이라는 가설과 일치하지만 미디어 요청의 세부 CPU
프로파일을 수집한 것은 아니다. 다음 대상은 미디어·검색 등 남은 단순 API와
미등록 RSC의 처리 비용이며, R2 인증·Range·RSC 오류 이동을 보존하며 검증해야 한다.

#### 기능·안전성 확인

- `pnpm verify`: 15개 파일 188개 테스트, MDX 26개 alt 검사 통과. OpenNext 빌드와 정적 응답 생성, Free 번들 용량 검사도 통과했다.
- 로컬 D1 smoke: 좋아요·댓글·답글·댓글 좋아요·수정·삭제와 정리, 방문자별 상태 분리, 잘못된 비밀번호의 수정·삭제 거부를 확인했다. 브라우저에서 조회·참여 이벤트 저장, 좋아요 후 목록 숫자 갱신을 확인하고 테스트 좋아요는 해제했다.
- 로컬 알림 후처리는 구독 0건과 임시 P-256 테스트 키로 검사했다. 실행 중 애플리케이션 오류는 없었으며 실제 알림은 발송하지 않았다. 로컬 AI/Vectorize 지원 경고와 의도적인 서버 종료의 exit 130은 별도로 구분한다.
- 원격 smoke: 25편·SEO·HTML/RSC/segment 일치·HEAD·Range·404 상태·비공개 캐시·API 헤더·OPTIONS·인증 거부를 확인했다. 원격 HTML ETag 누락 경고는 기존과 같으며 미해결이다.
- 첫 원격 smoke의 캐시 재사용 검사는 MISS로 실패했다. 별도 진단에서는 SJC의 MISS 뒤 7회 HIT를 확인했다. 최초 실패 쌍의 colo는 기록하지 않아 원인을 확정하지 않는다. 검사를 최대 8회로 제한된 저장 완료 대기와 **같은 colo의 연속 요청에서 실제 HIT**를 요구하도록 보강한 후 전체 smoke를 통과했다. 계속 MISS이거나 지역이 안정되지 않으면 검사를 실패시킨다.
- 브라우저에서 홈 → PostGIS 제목 링크 → 글, 404 → 홈 이동을 확인했다. 개인별 GET은 `X-API-Runtime: worker`, 조회·참여 POST는 Preview 정책대로 403이었다. 390px 화면에서 글의 히어로·코드 11블록·canonical·가로 넘침 없음과 페이지 오류 없음을 확인했다.
- 비공개 키를 제외한 생성 환경 모듈과 배포 대상 288개 파일을 검사했다. Preview binding은 AI/ASSETS/DB/MEDIA/Vectorize 두 개뿐이며 secret·Custom Domain은 추가하지 않았다.
- 운영 Pages deployment `87ceefa2-05e4-477e-bc82-2f66cd80c914`, commit `a86aef43f3997c0dc0f32c0b98287f749515162f`, 도메인 3개는 그대로다. 운영 200/noindex 없음과 Pages hostname 301도 재확인했다. Git 푸시·운영 데이터 쓰기·요금제 변경은 하지 않았다.

## 검증 결과

| 항목 | 결과 |
| --- | --- |
| Next.js 15 기준선 verify / build | 통과 |
| Next.js 16 `next dev` / `next build` | 통과, Turbopack·webpack 빌드 확인 |
| `pnpm verify` | 통과: 15개 파일, 188개 테스트, MDX 26개 alt 검사 |
| 생성물 없는 타입·테스트 검사 | `.open-next`를 임시 분리한 상태에서도 `pnpm verify` 통과, 이후 기존 생성물 복원 |
| `pnpm workers:build` | 통과: 게시글 25편 SSG, API 동적 경로 유지 |
| `pnpm workers:check` | Free 용량 한도 통과, 초과 번들 실패 확인, 실제 업로드 없음 |
| 브라우저 | 홈 → PostGIS 글 이동, 본문·히어로·제목·canonical, 코드 11블록·dual-theme span 397개, 라이트/다크 색상 전환, 새 세션의 page error 없음 |
| 로컬 시작 프로파일 | Active 20.2 ms / profile window 114.9 ms. 요청당 CPU나 원격 실행 결과가 아님 |
| Workers smoke | 25편, 홈·목록·태그·about·admin, RSS·sitemap·robots·404, HTML/전체 RSC/각 segment 일치, HEAD·304·Range |
| 로컬 API | 조회·인증 거부, Preview mutation 403·noindex·Pages canonical redirect |
| 로컬 D1 | 좋아요 토글, 댓글·답글 작성, 댓글 수정·좋아요, 삭제·정리 통과 |
| 로컬 R2 | 업로드·범위 읽기·정렬·파일/폴더 이름 변경·포스터·충돌·삭제 통과, 테스트 파일 정리 완료 |
| 격리 Web Push | workerd에서 AES-GCM 복호화·VAPID 서명·알림 3종·self-mute·만료 구독 정리 통과. 외부 요청 전부 가로채 실제 발송 없음 |
| 원격 AI / Vectorize / Claude / Web Push | 미검증, 실제 호출하지 않음 |
| 운영 R2 | 기존 이미지의 범위 읽기 통과, 쓰기 CRUD 미실행 |
| 원격 Preview | 읽기 전용 배포, 25편·SEO·RSC·API 조회·쓰기 차단·noindex·브라우저 통과 |
| 원격 CPU | 직접 API 반복 표본 개선: 통계 BYPASS P50 1.550 ms·개인 좋아요 2.091 ms. 첫 통계 CPU 미관측, Next RSC 404 P99 13.429 ms·미디어 API 276.033 ms로 전체 운영 전환 차단 |
| 지도 API / 장기 성능·요금 비교 / 도메인 rollback | 미검증 |

로컬 테스트용 댓글·좋아요는 삭제했다. 로컬 브라우저 테스트 이벤트는 로컬 D1에만
기록됐고, 원격 Preview의 조회·참여 이벤트는 쓰기 차단으로 기록되지 않았다.
운영 데이터와 DB 스키마는 변경하지 않았다.
`ctx.waitUntil`이 있는 API 응답은 확인했지만 실제 구독자에게 알림이 도착했다는
검증을 대신하지는 않는다.

## 비용 관련: 최초 계획에서 수정해야 할 가정

**현재 후보는 “SSG HTML까지 Worker 호출 0회” 조건을 충족하지 않는다.**

- JS/CSS/폰트/public 파일은 `run_worker_first: false`로 Worker를 우회한다.
- SSG HTML/RSC는 저장된 결과를 읽지만 요청 처리에 Worker가 실행된다.
- 최종 Preview 번들은 gzip 1,698.95 KiB(약 1.66 MiB)로 [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/#worker-size)의 Free 용량 제한을 충족한다. 용량 때문에 유료 전환할 필요는 없어졌다.
- 최초 Preview에서 첫 홈 요청 CPU 370.809 ms가 확인되어 SSG 스트리밍을 적용했다. 홈·게시글·직접 D1 API 표본은 개선됐지만 Next에 남긴 API·RSC 404의 CPU 초과와 일 100,000회 요청 한도·장기 사용량 비교는 별도로 남아 있다. 로컬 wall-clock 응답 시간이나 startup 프로파일은 요청당 CPU 검증을 대신하지 않는다.
- SSG 요청도 Worker를 실행하므로 기존 Pages와 요청·CPU 사용량이 달라진다. “무료로 안정 운영 가능” 또는 “추가 비용 없음”은 아직 확정하지 않는다. [요금 기준](https://developers.cloudflare.com/workers/platform/pricing/)

원래 계획의 비용·호출 조건을 자동으로 완화하지 않는다. 읽기 전용 Preview는
승인받아 배포했지만, Git 푸시·운영 전환·요금제 변경은 승인받지 않았다.

## 로컬 재검증

```sh
pnpm install --frozen-lockfile
pnpm cf:typegen
pnpm verify
pnpm workers:build
pnpm workers:check
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

1. Workers Free 유지. SSG·공개 통계 캐시·직접 D1 API·일반 미등록 글 문서는 개선했다. 다음은 남은 미디어·검색 API와 미등록 RSC 등의 Next.js 처리 비용 분리, 첫 요청 재측정, 현재 Pages 요청·CPU 기준선 비교다. 해결 전 운영 전환하지 않는다.
2. migration 브랜치 푸시 승인. **main 병합과 기존 Pages 자동 배포는 별도 단계**다.
3. 읽기 전용 `sw-blog-preview` 최초 배포 완료. Custom Domain은 지정하지 않았다. 다음 배포에도 생성물의 비공개 키 제거와 noindex·쓰기 차단을 재검증한다.
4. Pages/Worker binding·secret 목록 대조. 런타임 secret 4개와 지도 public build 변수 2개를 구분한다.
5. 원격 noindex·쓰기 차단·SSG·RSC·API 조회·번들 크기는 통과했다. CPU 최적화 후 첫 요청·반복 요청·미등록 경로를 다시 측정한다. 지도 도메인 제한은 별도 검증하며, 오류가 없다는 이유만으로 CPU 기준을 통과 처리하지 않는다.
6. 별도 테스트 리소스를 쓰거나 승인한 테스트 레코드만 사용해 R2/Vectorize 쓰기, Claude streaming, Web Push를 확인한다. Preview의 쓰기 차단을 무작정 해제하지 않는다.
7. Workers Builds 또는 GitHub Actions 배포 방식을 확정하고, **성공한 commit의 배포 후에만** 재인덱싱하도록 현재 Pages polling workflow를 교체한다.
8. 확정된 preview hostname을 분석 리포트 제외 규칙에 반영한다. 현재 보고서/대시보드를 임의의 hostname으로 바꾸지 않는다.
9. 별도 승인 후 Pages 자동 배포를 중지하고 도메인을 전환한다. Pages 마지막 성공 배포는 보존한다.
10. 장애 시 도메인을 Pages로 돌리고, 최소 7일간 오류·CPU·요금·SEO를 비교한다.

운영 rollback 원천은 현재 main의 `a86aef4` 및 전환 직전 Pages production deployment다.
새 코드에는 Pages 빌드 스크립트가 없으므로 새 브랜치를 Pages에 재배포하는 것을
rollback으로 착각하지 않는다. DB·데이터 형식은 바꾸지 않았으므로 기존 Pages와 호환된다.
