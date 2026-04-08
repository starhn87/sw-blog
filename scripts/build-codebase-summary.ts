import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "public/codebase-summary.txt");

function listFiles(dir: string, prefix = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listFiles(path.join(dir, entry.name), rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

function getPackageDeps(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
  const deps = Object.keys(pkg.dependencies || {});
  return deps.join(", ");
}

function getRoutes(): string[] {
  const appDir = path.join(ROOT, "src/app");
  const routes: string[] = [];

  function scan(dir: string, prefix: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name), `${prefix}/${entry.name}`);
      } else if (entry.name === "page.tsx") {
        routes.push(prefix || "/");
      } else if (entry.name === "route.ts") {
        routes.push(`${prefix} (API)`);
      }
    }
  }

  scan(appDir, "");
  return routes;
}

function getComponents(): string[] {
  const compDir = path.join(ROOT, "src/components");
  if (!fs.existsSync(compDir)) return [];
  return listFiles(compDir).filter((f) => f.endsWith(".tsx"));
}

function getPostsList(): { slug: string; title: string; tags: string[] }[] {
  const postsDir = path.join(ROOT, "content/posts");
  if (!fs.existsSync(postsDir)) return [];

  const matter = require("gray-matter");
  return fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(postsDir, f), "utf-8");
      const { data } = matter(raw);
      if (!data.published) return null;
      return {
        slug: f.replace(/\.mdx$/, ""),
        title: data.title,
        tags: data.tags || [],
      };
    })
    .filter(Boolean) as { slug: string; title: string; tags: string[] }[];
}

function buildSummary() {
  const routes = getRoutes();
  const components = getComponents();
  const posts = getPostsList();
  const deps = getPackageDeps();

  const lines: string[] = [
    "# 블로그 코드베이스 현황",
    "",
    "## 기술 스택",
    `주요 패키지: ${deps}`,
    "",
    "## 구현된 페이지 및 API",
    ...routes.map((r) => `- ${r}`),
    "",
    "## 컴포넌트 구조",
    ...components.map((c) => `- ${c}`),
    "",
    "## 게시글 목록",
    ...posts.map((p) => `- "${p.title}" (${p.slug}) [${p.tags.join(", ")}]`),
    "",
    "## 구현 완료된 기능",
  ];

  // 기능 감지
  const features: string[] = [];

  if (routes.some((r) => r.includes("api/views"))) features.push("조회수 카운터");
  if (routes.some((r) => r.includes("api/likes"))) features.push("좋아요 기능");
  if (routes.some((r) => r.includes("api/comments"))) features.push("댓글 시스템");
  if (routes.some((r) => r.includes("api/chat"))) features.push("AI 챗봇 (Claude API 기반)");
  if (components.some((c) => c.includes("ThemeToggle"))) features.push("다크모드 토글");
  if (components.some((c) => c.includes("SearchBar") || c.includes("Search"))) features.push("블로그 검색 (Fuse.js)");
  if (components.some((c) => c.includes("TOC") || c.includes("TableOfContents"))) features.push("목차 (Table of Contents)");
  if (fs.existsSync(path.join(ROOT, "src/app/sitemap.ts"))) features.push("SEO: sitemap.xml 자동 생성");
  if (fs.existsSync(path.join(ROOT, "src/app/robots.ts"))) features.push("SEO: robots.txt");
  if (fs.existsSync(path.join(ROOT, "src/app/feed.xml/route.ts"))) features.push("SEO: RSS 피드 (feed.xml)");

  // layout.tsx에서 Google 인증 확인
  const layoutPath = path.join(ROOT, "src/app/layout.tsx");
  if (fs.existsSync(layoutPath)) {
    const layout = fs.readFileSync(layoutPath, "utf-8");
    if (layout.includes("google-site-verification")) features.push("SEO: Google Search Console 인증 완료");
    if (layout.includes("naver-site-verification")) features.push("SEO: Naver Search Advisor 인증 완료");
    if (layout.includes("generateMetadata") || layout.includes("metadata")) features.push("SEO: OpenGraph 메타태그");
  }

  // blog/[slug]/page.tsx에서 기능 확인
  const slugPage = path.join(ROOT, "src/app/blog/[slug]/page.tsx");
  if (fs.existsSync(slugPage)) {
    const slugContent = fs.readFileSync(slugPage, "utf-8");
    if (slugContent.includes("application/ld+json")) features.push("SEO: Schema.org JSON-LD 구조화 데이터");
    if (slugContent.includes("ogImage") || slugContent.includes("og:image")) features.push("SEO: OG/Twitter 썸네일 이미지");
  }

  if (components.some((c) => c.includes("CodeBlock"))) features.push("코드 하이라이팅 (rehype-pretty-code/shiki)");
  if (routes.some((r) => r.includes("api/media"))) features.push("미디어 관리 (Cloudflare R2 스토리지)");
  if (fs.existsSync(path.join(ROOT, "src/lib/image.ts"))) features.push("이미지 최적화 (Cloudflare Image Transformations: AVIF/WebP 자동 변환, responsive srcset)");
  if (components.some((c) => c.includes("Video"))) features.push("비디오 재생 (Range Request 스트리밍)");
  if (components.some((c) => c.includes("ZoomableImage"))) features.push("이미지 클릭 확대 (ProseZoom, 원본 해상도 + ±2 prefetch)");
  if (components.some((c) => c.includes("PaginatedPosts"))) features.push("게시글 페이지네이션");
  if (routes.some((r) => r.includes("admin"))) features.push("어드민 미디어 관리 (업로드, 삭제, DnD 정렬)");
  if (components.some((c) => c.includes("ReadingProgress"))) features.push("읽기 진행률 프로그레스 바");
  if (components.some((c) => c.includes("ShareButton"))) features.push("링크 복사 공유 버튼");
  if (fs.existsSync(path.join(ROOT, "src/app/not-found.tsx"))) features.push("커스텀 404 페이지");
  if (fs.existsSync(path.join(ROOT, "public/og-default.png"))) features.push("기본 OG 이미지 (썸네일 없는 게시글용)");
  if (fs.existsSync(path.join(ROOT, "src/components/chat/ChatWidgetLazy.tsx"))) features.push("성능: ChatWidget 지연 로드 (next/dynamic, ssr:false)");
  if (fs.existsSync(path.join(ROOT, "src/components/blog/CommentSectionLazy.tsx"))) features.push("성능: CommentSection 지연 로드");
  if (fs.existsSync(path.join(ROOT, "src/app/fonts/PretendardVariable.woff2"))) features.push("성능: Pretendard 폰트 self-host (next/font/local)");

  lines.push(...features.map((f) => `- ${f}`));

  const summary = lines.join("\n");
  fs.writeFileSync(OUTPUT, summary);
  console.log(`Codebase summary built: ${summary.length} chars`);
}

buildSummary();
