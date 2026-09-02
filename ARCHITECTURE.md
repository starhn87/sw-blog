# ARCHITECTURE.md - 레포 현황 지도

> 이 문서는 **레포를 빠르게 파악하기 위한 진입점**이다. 구조/시스템/주요 파일 위치를 한곳에 모았다.
> 리빌드 "계획"은 `REBUILD_PLAN.md`, 코드 작성 규칙은 `CLAUDE.md`를 본다.
> 기능을 추가/변경하면 이 문서의 해당 섹션과 "작업별 진입점" 표를 함께 갱신한다.

## 한눈에

MDX 파일 기반 개인 블로그. 코드의 마이그레이션 후보는 Next.js 16 App Router + OpenNext + Cloudflare Workers/D1/R2/Vectorize/Workers AI다.
**운영은 아직 Next.js 15 + Pages다.** 읽기 전용 `sw-blog-preview.starhn87.workers.dev`를 병행 배포했다. 운영 도메인 전환·배포 자동화 교체는 승인 대기이며, 현재 코드 브랜치를 Pages로 배포하지 않는다.
글은 빌드 타임에 정적 생성(SSG)되고, 동적 데이터(조회/좋아요/댓글)만 D1에서 런타임 조회한다.

- **Live**: https://www.seung-woo.me/
- **Stack**: Next.js 16.3.4, React 19, TypeScript, Tailwind v4, Drizzle ORM, Framer Motion, MDX(next-mdx-remote)
- **Cloudflare**: 운영 Pages / 후보 Workers(OpenNext 1.20.6), D1(DB), R2(미디어), Vectorize x2(검색/RAG), Workers AI(bge-m3 임베딩)
- **AI**: Claude(`@anthropic-ai/sdk`), 모델 `claude-haiku-4-5`

## 디렉토리 맵

```
content/posts/*.mdx          # 블로그 글 20편 (frontmatter + 본문). 콘텐츠의 단일 원천
public/                      # 정적 자산 + 빌드 생성물(아래 "생성물" 참고)
src/
  app/
    layout.tsx               # 루트 레이아웃: 메타데이터, 폰트, 헤더/푸터, 챗 위젯, skip-link
    page.tsx                 # 홈 (Hero + 최근 글)
    blog/page.tsx            # 글 목록 (검색 포함)
    blog/[slug]/page.tsx     # 글 상세: SSG, generateMetadata, JSON-LD, MDX 렌더
    blog/tag/[tag]/page.tsx  # 태그별 글 모아보기 (SSG)
    about/page.tsx           # 소개
    admin/                   # 미디어 관리 어드민 (비밀번호 인증, noindex)
    feed.xml/route.ts        # RSS 2.0 (force-static)
    sitemap.ts, robots.ts    # SEO
    api/                     # Workers의 Node.js 호환 라우트 (아래 "백엔드" 참고)
  worker.ts                  # OpenNext 진입점: pages.dev → 정규 도메인 301, 프리뷰 noindex·쓰기 차단
  components/
    home/ about/             # 페이지별 섹션 컴포넌트
    layout/                  # Header, Footer, ThemeToggle 등
    blog/                    # PostCard, TOC, ViewCounter, LikeButton, 검색, 시리즈/관련글 등
    blog/comments/           # 댓글 UI
    blog/lazy/               # next/dynamic 래퍼 (ssr:false 지연 로드)
    mdx/                     # MDXComponents 맵: CodeBlock, Callout, ZoomableImage, Video, TravelMap(구글맵·해외), NaverTravelMap(네이버·국내) 등
    chat/                    # ChatWidget, ChatMessages, ChatInput
    admin/                   # AdminAuth, 미디어 그리드/업로더(dnd-kit)
    motion/                  # FadeIn, SlideUp 등 애니메이션 프리미티브
  lib/                       # 핵심 로직 (아래 "lib 지도")
  hooks/                     # useChat, useDebounce, useReadingProgress 등
  types/index.ts             # 공유 타입 (PostFrontmatter, Post 등)
scripts/                     # 빌드 타임 스크립트 (아래 "빌드 파이프라인")
drizzle/migrations/          # D1 마이그레이션 SQL
workers/chat-proxy/          # 별도 Worker 스텁 (wrangler.toml만, 미구현)
```

## lib 지도 (`src/lib/`)

| 파일 | 역할 |
|------|------|
| `mdx.ts` | MDX 읽기/파싱의 중심. `getAllPosts`, `getPostBySlug`, `getAllTags`, `getSeriesPosts`, `getRelatedPosts`. git 로그로 `updated` 자동 감지 |
| `schema.ts` | Drizzle D1 스키마: `views`, `dailyViews`, `analyticsEvents`, `likes`, `comments`, `commentLikes`, `pushSubscriptions` |
| `db.ts` | `getDB(env.DB)` - Drizzle 인스턴스 생성 |
| `auth.ts` | `hashPassword`(SHA-256), `getOrCreateVisitorId`(쿠키 기반 방문자 ID) |
| `rag.ts` | RAG 검색 헬퍼 (임베딩/Vectorize 조회 관련) |
| `image.ts` | Cloudflare Image Transformations URL 빌더: `getOptimizedImageUrl`, `getImageSrcSet` |
| `postStats.ts` | 브라우저의 카드·정렬 공유 집계. 진행 중 요청 중복 제거, 성공 응답 60초 보관, 변경 후 다음 조회에서 HTTP 캐시 우회 |
| `generatePoster.ts` | 비디오 포스터 프레임 생성 (어드민 업로드용) |
| `utils.ts` | `cn()` 등 범용 유틸 |
| `log.ts` | `logError(at, error, context)` - 구조화 JSON 한 줄을 `console.error`로. Cloudflare Real-time Logs에서 경로·메시지 검색용(Sentry 경량 대안). chat·search 라우트에 적용 |
| `push.ts` | 웹 푸시 알림: `notifyActivity(env, activity)` - 글 제목 조회 후 문구 생성, 저장된 구독 전체에 발송, 만료(404/410) 구독 정리. VAPID JWT(ES256) + RFC 8291 aes128gcm 페이로드 암호화를 `globalThis.crypto.subtle` 인라인 직접 호출로 자체 구현(라이브러리를 번들하면 crypto.subtle의 this가 끊겨 Illegal invocation). likes·comments 라우트가 `ctx.waitUntil`로 호출 |
| `analytics.ts` / `analytics.server.ts` | 독자 참여 이벤트 allowlist·클라이언트 전송, 날짜별 visitor hash와 이벤트별 수집 시작일 관리. 원문 검색어·IP·User-Agent는 저장하지 않음 |

## 핵심 시스템

### 1. 콘텐츠 (MDX) 파이프라인
- 글은 `content/posts/*.mdx`. frontmatter 타입은 `src/types/index.ts`의 `PostFrontmatter`.
  - 필수: `title, description, date, tags[], published`
  - 선택: `thumbnail, ogImage, series, seriesOrder, updated`
- `blog/[slug]/page.tsx`가 `generateStaticParams`로 공개 글을 빌드 타임에 정적 생성한다. `dynamicParams = false`로 미등록 slug의 런타임 생성·읽기 전용 캐시 쓰기를 막는다.
- frontmatter는 YAML/JSON만 지원한다. 사용하지 않는 JavaScript 평가 엔진과 MDX 의존성의 Workers 번들 호환성 패치는 `patches/README.md`를 참고한다.
- 렌더는 `next-mdx-remote` + `src/components/mdx/MDXComponents.tsx` 컴포넌트 맵. 코드 하이라이팅은 `rehype-pretty-code`(shiki, 클라이언트 JS 0). `next.config.mjs`가 Shiki 기본 import를 `src/lib/shiki.ts` 소형 번들에 연결한다. 현재 글의 언어와 GitHub dark/light 테마만 포함하고 JavaScript RegExp 엔진을 사용한다. 새 언어를 쓰면 이 목록에도 추가하며 `shiki.test.ts`가 전체 글의 색상 호환성을 검사한다.
- 목록용 데이터는 `getPostSummaries()`의 `PostSummary`로 분리한다. 홈·검색 목록·태그 페이지는 본문을 Client Component/RSC props에 포함하지 않으며, 글 상세만 `Post.content`를 렌더한다.
- Prefetch는 게시글 링크에 유지하고, 헤더의 현재 페이지 링크는 끈다. TagCloud는 마우스 hover·키보드 focus가 있는 태그만 prefetch한다.
- 홈 정렬 URL 구독과 검색 입력만 Suspense로 감싸 목록 카드·링크는 서버 HTML에 남긴다. 홈의 정렬 변경은 native History API로 URL과 클라이언트 상태만 바꾸며 RSC 재요청을 하지 않는다.
- 이미지: MDX의 `<img>`를 `<Img>`로 치환해 srcSet/sizes 자동 생성 + Cloudflare 변환.

### 2. 검색 + RAG 챗봇
두 시스템 모두 **Workers AI bge-m3 임베딩 + Cloudflare Vectorize**를 쓰지만 인덱스가 분리돼 있다.

- **검색** (`api/search/route.ts`): 하이브리드. 키워드 점수(제목 1.0/태그 0.7/설명 0.4/본문 0.2) + 벡터(`VECTORIZE`, 임계값 0.3~0.4). 키워드 우선, 벡터 보충, slug 중복 제거. Vectorize 실패 시 키워드만으로 폴백.
- **챗봇** (`api/chat/route.ts`): 질문 임베딩 → `RAG_VECTORIZE` topK 5(>0.3) → 청크 본문은 `public/rag-chunks.json`에서 매핑 → Claude **스트리밍** 호출(ReadableStream). system 프롬프트에 `codebase-summary.txt`와 작성자 소개(`src/data/about.ts`: 경력·성과·사이드프로젝트·스킬)를 prompt caching(ephemeral)으로 상시 포함(about은 RAG가 아니라 항상 주입해 작성자 질문에 안정적으로 답). 검색된 청크의 글을 중복 제거해 `X-Chat-Sources` 헤더로 전달 → 답변 하단 "참고한 글" 링크 칩. 클라이언트(`useChat`)는 문단(`\n\n`) 단위로 받아 `ChatMessages`에서 블록별 fade-in으로 표시(글자 타이핑 없음). 빈 화면엔 추천 질문 칩, 대화는 sessionStorage에 저장돼 새로고침엔 유지되지만 탭을 닫으면 초기화(서버 무저장).
- 인덱싱: `api/search/index`, `api/chat/index` (POST, `x-admin-password` 인증). 각각 `search-index.json` / `rag-chunks.json`을 읽어 임베딩 후 Vectorize에 upsert하고, R2의 ID manifest와 비교해 사라진 vector를 삭제.
- 클라이언트: `hooks/useChat.ts` + `components/chat/*`.

### 3. 백엔드 (API + D1 + R2)
OpenNext의 `getCloudflareContext().env`로 바인딩에 접근한다. `runtime = "edge"`는 사용하지 않으며 비동기 알림은 같은 context의 `ctx.waitUntil`을 사용한다.

| 라우트 | 메서드 | 역할 | 인증 |
|--------|--------|------|------|
| `api/views` | GET/POST | 누적 조회수 조회/증가; `days` GET은 날짜별 중복 제거 조회로 주간 인기 집계 | 없음 |
| `api/analytics` | GET/POST | 목록·추천 영역 노출·글 클릭·engaged read·검색 이벤트 기록. GET은 기간별 이벤트와 출처별 방문자일, 글별 방문·engaged read, 수집 완결성을 익명 집계 | 없음 |
| `api/likes` | GET/POST | 글 좋아요 토글; slug 없이 GET하면 글별 좋아요 집계 | visitor_id 쿠키 |
| `api/comments` | GET/POST/PUT/DELETE | 댓글 CRUD (대댓글 `parentId`); slug 없이 GET하면 글별 댓글 집계 | 댓글 비밀번호(SHA-256) |
| `api/comments/likes` | GET/POST | 댓글 좋아요 토글 | visitor_id 쿠키 |
| `api/search` | GET | 하이브리드 검색 | 없음 |
| `api/search/index` | POST | 검색 인덱스 재구성 | `x-admin-password` |
| `api/chat` | POST | RAG 챗봇 | 없음 |
| `api/chat/index` | POST | RAG 청크 재인덱싱 | `x-admin-password` |
| `api/media` | GET/POST/PUT/DELETE | R2 미디어 CRUD, 폴더/정렬 | `x-admin-password` |
| `api/push/subscribe` | POST/DELETE | 웹 푸시 구독 등록/해제 | `x-admin-password` |

- **DB 테이블**(D1): `views(slug PK, count)`, `daily_views(day, slug, visitor_hash)`, `analytics_events(day, event, slug, source, visitor_hash)`, `likes(slug, visitor_id, …)`(slug+visitor_id unique), `comments(slug, author, content, password, parentId, …)`, `comment_likes(commentId, visitor_id, …)`(commentId+visitor_id unique), `push_subscriptions(endpoint unique, p256dh, auth, visitor_id)`. `daily_views`와 `analytics_events`는 날짜별 SHA-256 hash로 중복 제거해 날짜 간 방문자를 연결하지 않는다. 답글은 같은 글의 최상위 댓글만 부모로 허용하고 부모 삭제 시 답글과 관련 좋아요도 함께 삭제.
- **어드민**: `app/admin/` + `components/admin/`. 인증은 `ADMIN_PASSWORD` 평문 비교, 클라이언트 `localStorage` 플래그. R2 미디어 업로드/삭제/이름변경/DnD 정렬(전체 cursor pagination, 이름변경 대상 충돌 거부). 헤더의 `PushSubscribeButton`으로 웹 푸시 구독/해제.
- **웹 푸시 알림**: admin에서 브라우저를 구독(VAPID + Service Worker `public/sw.js`; 구독은 브라우저·기기별로 별개). 좋아요(켤 때)·댓글·대댓글 시 `lib/push.ts`가 `ctx.waitUntil`로 저장된 모든 구독에 발송(활동한 visitor_id가 구독자 본인이면 self-mute해 본인 활동엔 알림 안 함), 클릭하면 해당 글로 이동. env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(공개), `VAPID_PRIVATE_KEY`·`VAPID_SUBJECT`(secret).

### 4. 빌드 / CI / 배포
- **빌드 파이프라인** (`package.json` scripts):
  - `predev`/`prebuild` → `build:indexes` = `build-search-index` + `build-rag-chunks` + `build-codebase-summary`
  - `prebuild`는 추가로 `check-mdx-alt`(이미지 alt 누락 시 빌드 실패)
  - `verify` = `lint && typecheck && test && check-mdx-alt`
- **CI** (`.github/workflows/`):
  - `ci.yml`: push/PR → install → `verify` → Workers build → `workers:check` (Wrangler dry-run + Free gzip 3 MiB 예산 검사, 업로드 없음)
  - `reindex.yml`: `content/posts/**` push → 해당 commit의 production 배포 성공을 제한 시간 동안 폴링 → `search/index` + `chat/index` 재인덱싱 자동 호출
- **운영 배포**: 기존 Cloudflare Pages. `wrangler.toml`과 기존 reindex workflow는 전환 전까지 보존한다.
- **Workers 후보**: `wrangler.worker.jsonc`, `open-next.config.ts`. `pnpm workers:build` → `pnpm workers:check` → `pnpm workers:preview`로 로컬 검증한다. Free 번들 용량 한도는 통과했고, 원격 CPU 초과 대응을 진행 중이다. Preview 재배포 전에 생성된 `next-env.mjs`에서 비공개 키를 제외하며 운영 키를 복사하지 않는다. 실제 deploy는 승인 범위 안에서만 실행한다.
- **요청 정책**: `src/worker.ts`가 공식 Custom Worker 방식으로 OpenNext handler를 호출한다. Next.js Node.js proxy는 사용하지 않는다. 이 진입점에서 Pages 정규 도메인 redirect와 프리뷰 noindex·쓰기 차단을 처리하며, 해당 정책은 `next dev`가 아닌 Workers preview에서 검증한다. 정적 자산 noindex는 `public/_headers`가 담당한다.
- **캐시**: 별도 KV/R2 없이 Workers Static Assets에 빌드 결과를 보관한다. JS/CSS/public 자산은 Worker를 우회하지만 SSG HTML/RSC 응답에는 Worker가 실행된다. `workers:build`의 `build-static-responses.mjs`가 immutable SSG 캐시를 HTML·전체 RSC·segment별 파일로 분리하고 `src/worker.ts`가 필요한 파일을 스트리밍한다. 매 요청의 대형 JSON 파싱·해시 계산·Next.js 서버 실행을 생략한다. `experimental.prefetchInlining: false`로 개별 segment를 생성하며, 정적 응답 대상이 아닌 요청은 Next.js에 맡긴다(`enableCacheInterception: false`). `workers:smoke`가 빌드 결과와 실제 응답의 일치, HEAD/304, RSC 분리를 검사한다.
- **마이그레이션 현황**: vinext의 Worker SSG 차단 문제로 계획의 OpenNext fallback을 선택했다. 실행 결과·비용 조건·남은 승인은 `docs/next16-workers-progress.md`, 원안은 `docs/next16-vinext-migration.md`를 본다.
- **공개 집계 캐시**: Worker 진입점이 `GET /api/views`, `/api/views?days=7`, `/api/likes`, `/api/comments`만 Cache API에 30초 저장한다. 호스트별 키를 사용하고 인증·RSC·Range·명시적 재검증·비공개 응답은 제외한다. `X-Stats-Cache`로 HIT/MISS/BYPASS를 구분한다. 브라우저 통계 캐시 60초와 합쳐 일반 조회는 최대 약 90초 지연될 수 있으며, 변경 후 다음 조회는 두 캐시를 우회한다. 새 저장소나 Workers Cache(요청 과금 범위가 달라지는 별도 기능)는 사용하지 않는다.

## 생성물 (빌드 산출물, git 미추적 가능성)
`scripts/`가 `public/`에 만든다. 직접 편집하지 말고 스크립트/소스를 고친다.
- `public/search-index.json` - 검색용 (slug, title, description, tags, 본문 1000자)
- `public/rag-chunks.json` - 챗봇용 청크 (500단어/50오버랩, slug+title+chunkIndex+content)
- `public/codebase-summary.txt` - 챗봇 system 프롬프트용 프로젝트 요약
- `public/og-default.png` - 기본 OG 이미지 (`gen-og-default.mjs`, 수동 실행)

## Cloudflare 바인딩 (`cloudflare-env.d.ts` / `wrangler.worker.jsonc`)
`DB`(D1) · `MEDIA`(R2) · `AI`(Workers AI) · `VECTORIZE`(검색) · `RAG_VECTORIZE`(RAG)
Workers 추가 binding: `ASSETS`. 타입은 `pnpm cf:typegen`으로 생성한다.
env: `ANTHROPIC_API_KEY` · `ADMIN_PASSWORD` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` · `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`(해외 여행기 TravelMap, Places API New) · `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`(국내 여행기 NaverTravelMap, 네이버 지도 v3). 사용처가 없던 `CF_AIG_TOKEN` 선언은 제거했다.

## 데이터 흐름 (요약)

```
글 작성/수정 (content/posts/*.mdx)
  └ 빌드 → search-index.json / rag-chunks.json / codebase-summary.txt 생성 (public/)
  └ push(main) → CI verify → Pages 배포 → reindex.yml이 Vectorize 재인덱싱

독자 요청
  ├ 글 상세       : SSG된 정적 페이지 + 조회/좋아요/댓글 + 익명 engaged read 집계
  ├ 글 탐색       : 목록·검색·관련 글·시리즈 노출/클릭 집계 + 최근 7일 주간 인기 정렬
  ├ 검색          : api/search → 키워드 + VECTORIZE 벡터 → 병합
  └ 챗봇          : api/chat → 질문 임베딩 → RAG_VECTORIZE → 청크 → Claude
```

## 작업별 진입점

| 하고 싶은 것 | 먼저 볼 곳 |
|--------------|-----------|
| 새 글 쓰기 | `content/posts/*.mdx`, frontmatter는 `types/index.ts`. (skill: new-post) |
| MDX 렌더/컴포넌트 추가 | `components/mdx/MDXComponents.tsx`, 코드 강조 언어는 `lib/shiki.ts` |
| 글 목록/상세 페이지 수정 | `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` |
| 태그 페이지 | `app/blog/tag/[tag]/page.tsx`, `lib/mdx.ts`(`getPostsByTag`) |
| 홈 정렬·태그 / 태그 아카이브 | `components/home/{HomePostFeed,TagCloud}.tsx`, `app/blog/tag/page.tsx`, `lib/postStats.ts`, `api/{views,likes,comments}`(GET 집계) |
| 챗봇 동작 변경 | `app/api/chat/route.ts`, `lib/rag.ts`, `hooks/useChat.ts`, `components/chat/*` |
| 검색 로직 변경 | `app/api/search/route.ts`, `scripts/build-search-index.ts` |
| 청킹/RAG 인덱싱 변경 | `scripts/build-rag-chunks.ts`, `app/api/chat/index/route.ts` |
| DB 스키마 변경 | `lib/schema.ts` → drizzle 마이그레이션 생성 → `drizzle/migrations/` |
| 댓글/좋아요/조회 | `app/api/{comments,likes,views}/route.ts`, `components/blog/` |
| 이미지 최적화 | `lib/image.ts`, `components/mdx/MDXComponents.tsx` |
| 미디어 어드민 | `app/admin/`, `components/admin/`, `app/api/media/route.ts` |
| SEO/메타데이터 | `app/layout.tsx`, `app/blog/[slug]/page.tsx`(generateMetadata), `sitemap.ts`, `feed.xml/route.ts`, `src/worker.ts`, `public/_headers` |
| 배포/바인딩 | `wrangler.worker.jsonc`, `open-next.config.ts`, `cloudflare-env.d.ts`, `scripts/check-worker-size.mjs`, `docs/next16-workers-progress.md`, `.github/workflows/` (운영 Pages 설정은 `wrangler.toml`) |

## 알려진 한계 / 개선 백로그
현황 기준 약한 지점(필요할 때 참고). 개인 블로그 규모를 고려해 과한 인프라는 의도적으로 제외.
- 챗봇: 재랭킹 없음, 서버측 대화 저장 없음(클라이언트 sessionStorage만)
- 콘텐츠 탐색: 목록 페이지네이션 없음(전체 로드)
- 보안: 전 API rate limit 없음(특히 `api/chat`=비용, `api/comments`=스팸)
- 테스트: 단위 테스트 12파일/100개와 Workers smoke가 있다. API 경계값·요청 정책은 검사하지만 전체 UI e2e는 자동화하지 않았다.
- 캐싱: 미디어·공개 집계 외 GET API는 대부분 매 요청 처리한다. 공개 집계 캐시 미스와 개인별 API의 Next.js 초기 CPU 비용은 남아 있다.
