# sw-blog 제로베이스 리빌드 계획

## Context
현재 Notion API 기반 블로그를 MDX + Cloudflare D1 기반으로 전면 재구축한다.
Notion의 이미지 만료, API 속도/제한, 캐싱 부재 문제를 해결하고, AI 챗봇 등 인터랙티브 기능을 추가하여 포트폴리오급 블로그로 만든다.

## 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Content**: MDX 파일 (로컬, git 관리)
- **DB**: Cloudflare D1 (Drizzle ORM)
- **Styling**: Tailwind CSS v4 + Framer Motion
- **AI**: Claude API (@anthropic-ai/sdk) + Vercel AI SDK
- **배포**: Cloudflare Pages (@cloudflare/next-on-pages)
- **코드 하이라이팅**: rehype-pretty-code (shiki) — 클라이언트 JS 제로
- **검색**: Fuse.js (클라이언트 사이드, 빌드 시 인덱스 생성)

## 프로젝트 구조
```
sw-blog/
├── content/posts/              # MDX 블로그 글
├── public/images/              # 이미지 (만료 없음)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 루트 레이아웃 (헤더, 푸터, 챗 위젯)
│   │   ├── page.tsx            # 홈 (히어로 + 최근 글)
│   │   ├── blog/
│   │   │   ├── page.tsx        # 글 목록 + 검색
│   │   │   └── [slug]/page.tsx # 글 상세 (MDX 렌더링)
│   │   ├── about/page.tsx      # 소개 페이지
│   │   └── api/
│   │       ├── views/route.ts
│   │       ├── likes/route.ts
│   │       ├── comments/route.ts
│   │       ├── chat/route.ts   # Claude API 스트리밍
│   │       └── search/route.ts
│   ├── components/
│   │   ├── ui/                 # 기본 UI (button, card, badge 등)
│   │   ├── layout/             # Header, Footer, ThemeToggle
│   │   ├── blog/               # PostCard, TOC, ViewCounter, LikeButton, CommentSection, SearchBar
│   │   ├── mdx/                # CodeBlock, Callout, ImageZoom
│   │   ├── chat/               # ChatWidget, ChatMessages, ChatInput
│   │   └── motion/             # FadeIn, SlideUp, StaggerChildren
│   ├── lib/
│   │   ├── mdx.ts              # MDX 파일 읽기/파싱
│   │   ├── db.ts               # Drizzle + D1 연결
│   │   ├── schema.ts           # DB 스키마
│   │   ├── claude.ts           # Claude API 클라이언트
│   │   └── utils.ts
│   ├── hooks/                  # useDebounce, useIntersection 등
│   └── types/index.ts
├── drizzle/migrations/
├── scripts/
│   └── build-search-index.ts   # 빌드 시 검색 인덱스 생성
├── wrangler.jsonc
└── package.json
```

## DB 스키마 (Cloudflare D1)
```sql
CREATE TABLE views (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(slug, visitor_id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 구현 단계

### Phase 1: 기반 세팅
- [ ] Next.js 15 프로젝트 클린업 (기존 Notion 코드 제거)
- [ ] Tailwind CSS v4 + 다크모드 설정
- [ ] @cloudflare/next-on-pages 설정, wrangler.jsonc D1 바인딩
- [ ] Drizzle ORM 세팅 + 마이그레이션
- [ ] 루트 레이아웃: Header (sticky, blur backdrop), Footer, ThemeToggle
- [ ] Framer Motion 애니메이션 래퍼 컴포넌트 (FadeIn, SlideUp, StaggerChildren)

### Phase 2: MDX 블로그 코어
- [ ] `lib/mdx.ts`: MDX 파일 읽기, frontmatter 파싱, 컴파일
- [ ] Frontmatter 스키마: title, description, date, tags, published, thumbnail
- [ ] 블로그 목록 페이지 (/blog) — PostCard 그리드, 태그 필터
- [ ] 블로그 상세 페이지 (/blog/[slug]) — MDX 렌더링
- [ ] MDX 커스텀 컴포넌트: CodeBlock (shiki), Callout, ImageZoom
- [ ] TableOfContents (scroll-spy, IntersectionObserver)
- [ ] generateStaticParams로 정적 생성
- [ ] 기존 Notion 글 1~2개를 MDX로 마이그레이션 (테스트용)

### Phase 3: 조회수, 좋아요, 댓글
- [ ] API 라우트: views (GET/POST), likes (GET/POST), comments (GET/POST/DELETE)
- [ ] ViewCounter: 방문 시 자동 증가 (세션 중복 방지)
- [ ] LikeButton: 애니메이션 하트, optimistic UI, localStorage 상태 유지
- [ ] CommentSection: 작성자명 + 내용, 대댓글(parent_id) 지원
- [ ] Rate limiting (D1 기반, IP 해싱)

### Phase 4: 검색
- [ ] `scripts/build-search-index.ts`: 빌드 시 MDX → 검색 인덱스 JSON 생성
- [ ] package.json에 `"prebuild": "tsx scripts/build-search-index.ts"` 추가
- [ ] 클라이언트 사이드 Fuse.js 검색 (즉시 응답, 네트워크 불필요)
- [ ] SearchBar: 디바운스 입력, 결과 드롭다운

### Phase 5: AI 챗봇
- [ ] 빌드 시 MDX → RAG 청크 JSON 생성 (500토큰 단위, 오버랩 포함)
- [ ] `api/chat/route.ts`: 키워드 매칭으로 관련 청크 검색 → Claude API 스트리밍 응답
- [ ] ChatWidget: 플로팅 버튼 (우하단) → 확장 패널
- [ ] ChatMessages: 메시지 히스토리 + 스트리밍 텍스트 효과
- [ ] ChatInput: 입력 + 전송 버튼
- [ ] Vercel AI SDK `useChat` 훅으로 스트리밍 상태 관리
- [ ] Rate limiting (20req/hour per IP)
- [ ] 시스템 프롬프트: 블로그 콘텐츠 기반 답변, 관련 없는 질문은 정중히 리다이렉트

### Phase 6: SEO & 마무리
- [ ] generateMetadata: 모든 페이지에 OG 태그, 메타 정보
- [ ] sitemap.ts: 동적 사이트맵
- [ ] feed.xml/route.ts: RSS 피드
- [ ] JSON-LD 구조화 데이터
- [ ] Lighthouse 퍼포먼스 최적화
- [ ] 페이지 전환 애니메이션

## 주요 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 코드 하이라이팅 | shiki (rehype-pretty-code) | react-syntax-highlighter 대비 클라이언트 JS 200KB 절감 |
| 검색 | 클라이언트 Fuse.js | 100개 미만 글에서 즉시 응답, 오프라인 동작, API 불필요 |
| RAG | 키워드 매칭 | 개인 블로그 규모에서 충분, 벡터 DB 외부 의존성 제로 |
| 댓글 | 익명 (이름 입력) | OAuth 복잡도 대비 이점 없음, rate limiting으로 스팸 방지 |
| 이미지 | 로컬 public 폴더 | Notion S3 URL 만료 문제 완전 해결, CDN 자동 제공 |
| MDX 처리 | next-mdx-remote/rsc | @next/mdx 대비 유연한 파일 위치, 동적 frontmatter 지원 |
| Cloudflare 어댑터 | @cloudflare/next-on-pages | 기존 배포 환경과 호환, 안정적 |

## Edge Runtime 주의사항
- `fs`는 빌드 타임에만 사용 가능 (런타임 X) → MDX 읽기는 generateStaticParams/빌드 시에만
- Node.js 내장 모듈 대신 Web API 사용 (crypto → Web Crypto API)
- D1 바인딩은 `getRequestContext()`로 접근
- 모든 API 라우트에 `export const runtime = 'edge'` 선언

## API 라우트 설계

| Method | Route | 용도 | Rate Limit |
|--------|-------|------|------------|
| GET | `/api/views?slug=x` | 조회수 조회 | 없음 |
| POST | `/api/views` | 조회수 증가 | 1/slug/session |
| GET | `/api/likes?slug=x` | 좋아요 수 + 상태 | 없음 |
| POST | `/api/likes` | 좋아요 토글 | 60/hour |
| GET | `/api/comments?slug=x` | 댓글 목록 | 없음 |
| POST | `/api/comments` | 댓글 작성 | 10/hour |
| DELETE | `/api/comments?id=x` | 댓글 삭제 (관리자) | 없음 |
| POST | `/api/chat` | AI 챗봇 스트리밍 | 20/hour |

## 검증 방법
1. `pnpm dev`로 로컬 개발 서버 확인
2. `wrangler pages dev`로 Cloudflare 환경 테스트
3. MDX 글 작성 → 목록/상세 렌더링 확인
4. API 라우트 테스트 (조회수, 좋아요, 댓글)
5. 챗봇 스트리밍 응답 확인
6. Lighthouse 점수 확인
7. `pnpm build` 후 Cloudflare Pages 배포

## 핵심 패키지

```
# MDX
next-mdx-remote gray-matter reading-time rehype-pretty-code shiki rehype-slug rehype-autolink-headings remark-gfm

# DB
drizzle-orm drizzle-kit @cloudflare/next-on-pages

# Styling & Animation
tailwindcss@4 framer-motion next-themes tailwind-merge clsx class-variance-authority lucide-react @tailwindcss/typography

# AI
@anthropic-ai/sdk ai

# Search
fuse.js
```
