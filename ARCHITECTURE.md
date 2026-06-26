# ARCHITECTURE.md - 레포 현황 지도

> 이 문서는 **레포를 빠르게 파악하기 위한 진입점**이다. 구조/시스템/주요 파일 위치를 한곳에 모았다.
> 리빌드 "계획"은 `REBUILD_PLAN.md`, 코드 작성 규칙은 `CLAUDE.md`를 본다.
> 기능을 추가/변경하면 이 문서의 해당 섹션과 "작업별 진입점" 표를 함께 갱신한다.

## 한눈에

MDX 파일 기반 개인 블로그. Next.js 15 App Router + Cloudflare 풀스택(Pages/D1/R2/Vectorize/Workers AI) + Claude RAG 챗봇.
모든 API 라우트는 `export const runtime = "edge"`. 글은 빌드 타임에 정적 생성(SSG)되고, 동적 데이터(조회/좋아요/댓글)만 D1에서 런타임 조회한다.

- **Live**: https://www.seung-woo.me/
- **Stack**: Next.js 15, React 19, TypeScript, Tailwind v4, Drizzle ORM, Framer Motion, MDX(next-mdx-remote)
- **Cloudflare**: Pages(배포), D1(DB), R2(미디어), Vectorize x2(검색/RAG), Workers AI(bge-m3 임베딩)
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
    api/                     # 9개 edge 라우트 (아래 "백엔드" 참고)
  components/
    home/ about/             # 페이지별 섹션 컴포넌트
    layout/                  # Header, Footer, ThemeToggle 등
    blog/                    # PostCard, TOC, ViewCounter, LikeButton, 검색, 시리즈/관련글 등
    blog/comments/           # 댓글 UI
    blog/lazy/               # next/dynamic 래퍼 (ssr:false 지연 로드)
    mdx/                     # MDXComponents 맵: CodeBlock, Callout, ZoomableImage, Video 등
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
| `schema.ts` | Drizzle D1 스키마: `views`, `likes`, `comments`, `commentLikes` |
| `db.ts` | `getDB(env.DB)` - Drizzle 인스턴스 생성 |
| `auth.ts` | `hashPassword`(SHA-256), `getOrCreateVisitorId`(쿠키 기반 방문자 ID) |
| `rag.ts` | RAG 검색 헬퍼 (임베딩/Vectorize 조회 관련) |
| `image.ts` | Cloudflare Image Transformations URL 빌더: `getOptimizedImageUrl`, `getImageSrcSet` |
| `generatePoster.ts` | 비디오 포스터 프레임 생성 (어드민 업로드용) |
| `utils.ts` | `cn()` 등 범용 유틸 |

## 핵심 시스템

### 1. 콘텐츠 (MDX) 파이프라인
- 글은 `content/posts/*.mdx`. frontmatter 타입은 `src/types/index.ts`의 `PostFrontmatter`.
  - 필수: `title, description, date, tags[], published`
  - 선택: `thumbnail, ogImage, series, seriesOrder, updated`
- `blog/[slug]/page.tsx`가 `generateStaticParams`로 전 글을 빌드 타임에 정적 생성.
- 렌더는 `next-mdx-remote` + `src/components/mdx/MDXComponents.tsx` 컴포넌트 맵. 코드 하이라이팅은 `rehype-pretty-code`(shiki, 클라이언트 JS 0).
- 이미지: MDX의 `<img>`를 `<Img>`로 치환해 srcSet/sizes 자동 생성 + Cloudflare 변환.

### 2. 검색 + RAG 챗봇
두 시스템 모두 **Workers AI bge-m3 임베딩 + Cloudflare Vectorize**를 쓰지만 인덱스가 분리돼 있다.

- **검색** (`api/search/route.ts`): 하이브리드. 키워드 점수(제목 1.0/태그 0.7/설명 0.4/본문 0.2) + 벡터(`VECTORIZE`, 임계값 0.3~0.4). 키워드 우선, 벡터 보충, slug 중복 제거. Vectorize 실패 시 키워드만으로 폴백.
- **챗봇** (`api/chat/route.ts`): 질문 임베딩 → `RAG_VECTORIZE` topK 5(>0.3) → 청크 본문은 `public/rag-chunks.json`에서 매핑 → Claude **스트리밍** 호출(ReadableStream). system 프롬프트에 `codebase-summary.txt`를 prompt caching(ephemeral)으로 포함. 검색된 청크의 글을 중복 제거해 `X-Chat-Sources` 헤더로 전달 → 답변 하단 "참고한 글" 링크 칩. 클라이언트(`useChat`)는 문단(`\n\n`) 단위로 받아 `ChatMessages`에서 블록별 fade-in으로 표시(글자 타이핑 없음). 빈 화면엔 추천 질문 칩, 대화는 localStorage에 저장돼 새로고침 후에도 유지(서버 무저장).
- 인덱싱: `api/search/index`, `api/chat/index` (POST, `x-admin-password` 인증). 각각 `search-index.json` / `rag-chunks.json`을 읽어 임베딩 후 Vectorize에 upsert.
- 클라이언트: `hooks/useChat.ts` + `components/chat/*`.

### 3. 백엔드 (API + D1 + R2)
모든 라우트 `runtime = "edge"`. `getRequestContext().env`로 바인딩 접근.

| 라우트 | 메서드 | 역할 | 인증 |
|--------|--------|------|------|
| `api/views` | GET/POST | 조회수 조회/증가; slug 없이 GET하면 인기글 상위 | 없음 |
| `api/likes` | GET/POST | 글 좋아요 토글; slug 없이 GET하면 글별 좋아요 집계 | visitor_id 쿠키 |
| `api/comments` | GET/POST/PUT/DELETE | 댓글 CRUD (대댓글 `parentId`); slug 없이 GET하면 글별 댓글 집계 | 댓글 비밀번호(SHA-256) |
| `api/comments/likes` | GET/POST | 댓글 좋아요 토글 | visitor_id 쿠키 |
| `api/search` | GET | 하이브리드 검색 | 없음 |
| `api/search/index` | POST | 검색 인덱스 재구성 | `x-admin-password` |
| `api/chat` | POST | RAG 챗봇 | 없음 |
| `api/chat/index` | POST | RAG 청크 재인덱싱 | `x-admin-password` |
| `api/media` | GET/POST/PUT/DELETE | R2 미디어 CRUD, 폴더/정렬 | `x-admin-password` |

- **DB 테이블**(D1): `views(slug PK, count)`, `likes(slug, visitor_id, …)`, `comments(slug, author, content, password, parentId, …)`, `comment_likes(commentId, visitor_id, …)`.
- **어드민**: `app/admin/` + `components/admin/`. 인증은 `ADMIN_PASSWORD` 평문 비교, 클라이언트 `localStorage` 플래그. R2 미디어 업로드/삭제/이름변경/DnD 정렬.

### 4. 빌드 / CI / 배포
- **빌드 파이프라인** (`package.json` scripts):
  - `predev`/`prebuild` → `build:indexes` = `build-search-index` + `build-rag-chunks` + `build-codebase-summary`
  - `prebuild`는 추가로 `check-mdx-alt`(이미지 alt 누락 시 빌드 실패)
  - `verify` = `lint && typecheck && test && check-mdx-alt`
- **CI** (`.github/workflows/`):
  - `ci.yml`: push/PR → install → `verify`
  - `reindex.yml`: `content/posts/**` push → Cloudflare 배포 완료 폴링 → `search/index` + `chat/index` 재인덱싱 자동 호출
- **배포**: Cloudflare Pages(`@cloudflare/next-on-pages`). 바인딩은 `wrangler.toml`.

## 생성물 (빌드 산출물, git 미추적 가능성)
`scripts/`가 `public/`에 만든다. 직접 편집하지 말고 스크립트/소스를 고친다.
- `public/search-index.json` - 검색용 (slug, title, description, tags, 본문 1000자)
- `public/rag-chunks.json` - 챗봇용 청크 (500단어/50오버랩, slug+title+chunkIndex+content)
- `public/codebase-summary.txt` - 챗봇 system 프롬프트용 프로젝트 요약
- `public/og-default.png` - 기본 OG 이미지 (`gen-og-default.mjs`, 수동 실행)

## Cloudflare 바인딩 (`env.d.ts` / `wrangler.toml`)
`DB`(D1) · `MEDIA`(R2) · `AI`(Workers AI) · `VECTORIZE`(검색) · `RAG_VECTORIZE`(RAG)
env: `ANTHROPIC_API_KEY` · `ADMIN_PASSWORD` · `CF_AIG_TOKEN`(AI Gateway)

## 데이터 흐름 (요약)

```
글 작성/수정 (content/posts/*.mdx)
  └ 빌드 → search-index.json / rag-chunks.json / codebase-summary.txt 생성 (public/)
  └ push(main) → CI verify → Pages 배포 → reindex.yml이 Vectorize 재인덱싱

독자 요청
  ├ 글 상세       : SSG된 정적 페이지 + (조회/좋아요/댓글만 D1 런타임 조회)
  ├ 검색          : api/search → 키워드 + VECTORIZE 벡터 → 병합
  └ 챗봇          : api/chat → 질문 임베딩 → RAG_VECTORIZE → 청크 → Claude
```

## 작업별 진입점

| 하고 싶은 것 | 먼저 볼 곳 |
|--------------|-----------|
| 새 글 쓰기 | `content/posts/*.mdx`, frontmatter는 `types/index.ts`. (skill: new-post) |
| MDX 렌더/컴포넌트 추가 | `components/mdx/MDXComponents.tsx` |
| 글 목록/상세 페이지 수정 | `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` |
| 태그 페이지 | `app/blog/tag/[tag]/page.tsx`, `lib/mdx.ts`(`getPostsByTag`) |
| 홈 정렬·태그 / 태그 아카이브 | `components/home/{HomePostFeed,TagCloud}.tsx`, `app/blog/tag/[tag]/page.tsx`, `api/{views,likes,comments}`(GET 집계) |
| 챗봇 동작 변경 | `app/api/chat/route.ts`, `lib/rag.ts`, `hooks/useChat.ts`, `components/chat/*` |
| 검색 로직 변경 | `app/api/search/route.ts`, `scripts/build-search-index.ts` |
| 청킹/RAG 인덱싱 변경 | `scripts/build-rag-chunks.ts`, `app/api/chat/index/route.ts` |
| DB 스키마 변경 | `lib/schema.ts` → drizzle 마이그레이션 생성 → `drizzle/migrations/` |
| 댓글/좋아요/조회 | `app/api/{comments,likes,views}/route.ts`, `components/blog/` |
| 이미지 최적화 | `lib/image.ts`, `components/mdx/MDXComponents.tsx` |
| 미디어 어드민 | `app/admin/`, `components/admin/`, `app/api/media/route.ts` |
| SEO/메타데이터 | `app/layout.tsx`, `app/blog/[slug]/page.tsx`(generateMetadata), `sitemap.ts`, `feed.xml/route.ts` |
| 배포/바인딩 | `wrangler.toml`, `env.d.ts`, `.github/workflows/` |

## 알려진 한계 / 개선 백로그
현황 기준 약한 지점(필요할 때 참고). 개인 블로그 규모를 고려해 과한 인프라는 의도적으로 제외.
- 챗봇: 재랭킹 없음, 서버측 대화 저장 없음(클라이언트 localStorage만)
- 콘텐츠 탐색: 목록 페이지네이션 없음(전체 로드)
- 보안: 전 API rate limit 없음(특히 `api/chat`=비용, `api/comments`=스팸), 댓글 입력 길이/sanitize 검증 약함
- 테스트: 단위 테스트 2개(`lib/utils.test.ts`, `lib/image.test.ts`)뿐, API/컴포넌트/e2e 없음
- 캐싱: GET API 대부분 `Cache-Control` 미설정(매 요청 D1 조회), 미디어만 캐싱
