# sw-blog

MDX + AI 챗봇 기반 개인 블로그

**Live**: https://www.seung-woo.me/

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Content**: MDX (로컬 파일, git 관리)
- **Database**: Cloudflare D1 (Drizzle ORM)
- **Styling**: Tailwind CSS v4 + Framer Motion
- **AI Chatbot**: Claude API + Vercel AI SDK
- **Deploy**: Cloudflare Pages

## Features

- MDX 블로그 (코드 하이라이팅, 목차, 이미지 줌)
- AI 챗봇 (블로그 콘텐츠 기반 RAG Q&A)
- 댓글 시스템
- 조회수 / 좋아요
- 전문 검색
- 다크모드
- SEO (OG 태그, sitemap, RSS)

## Getting Started

```bash
pnpm install
pnpm dev
```

## Project Structure

```
content/posts/          # MDX 블로그 글
src/
├── app/                # 페이지 & API 라우트
├── components/         # UI, 레이아웃, 블로그, 챗봇 컴포넌트
├── lib/                # MDX 파싱, DB, Claude API 클라이언트
├── hooks/              # 커스텀 훅
└── types/              # 타입 정의
```

## Deployment

Cloudflare Pages로 배포한다.

```bash
pnpm build
wrangler pages deploy
```
