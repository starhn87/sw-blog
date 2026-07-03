export const skillCategories = [
  {
    label: "Frontend",
    skills: [
      { name: "TypeScript", url: "https://www.typescriptlang.org" },
      { name: "React", url: "https://react.dev" },
      { name: "React Native", url: "https://reactnative.dev" },
      { name: "Next.js", url: "https://nextjs.org" },
      { name: "Tailwind CSS", url: "https://tailwindcss.com" },
      { name: "Framer Motion", url: "https://www.framer.com/motion" },
    ],
  },
  {
    label: "State & Data",
    skills: [
      { name: "Zustand", url: "https://zustand.docs.pmnd.rs" },
      { name: "XState", url: "https://stately.ai/docs/xstate" },
      { name: "TanStack Query", url: "https://tanstack.com/query" },
      { name: "GraphQL", url: "https://graphql.org" },
      { name: "Apollo Client", url: "https://www.apollographql.com/docs/react" },
      { name: "Supabase", url: "https://supabase.com" },
      { name: "Drizzle", url: "https://orm.drizzle.team" },
      { name: "SQLite", url: "https://www.sqlite.org" },
    ],
  },
  {
    label: "Infra & Tools",
    skills: [
      { name: "Cloudflare", url: "https://www.cloudflare.com" },
      { name: "Vercel", url: "https://vercel.com" },
      { name: "AWS", url: "https://aws.amazon.com" },
      { name: "Expo", url: "https://expo.dev" },
      { name: "GTM", url: "https://tagmanager.google.com" },
      { name: "Claude", url: "https://claude.ai" },
    ],
  },
];

export const skills = skillCategories.flatMap((c) => c.skills.map((s) => s.name));

export const highlights = [
  {
    to: 70,
    suffix: "%↓",
    label: "인프라 비용",
    detail: "프론트엔드 서버 10대 → 2대",
  },
  {
    prefix: "3% → ",
    to: 85,
    suffix: "%",
    label: "Core Web Vitals Good URL",
    detail: "MAU 170만 글로벌 서비스",
  },
  {
    to: 5,
    suffix: "+% ↑",
    label: "예약 전환율",
    detail: "퍼널 단계 축소 · 모달 통합",
  },
  {
    to: 10,
    suffix: "+% ↑",
    label: "검색 유입",
    detail: "다국어 SEO",
  },
];

export const careers = [
  {
    company: "크리에이트립",
    role: "프론트엔드 개발자",
    period: "2023.11 - 2026.02",
    url: "https://www.creatrip.com",
    description:
      "글로벌 여행 플랫폼(MAU 170만)에서 예약 퍼널을 단계 축소·모달 통합으로 다시 짜 전환률을 5% 이상 끌어올렸어요. SSG에서 SSR + CDN + SWR 구조로 옮기면서 서버 10대를 2대로 줄였고, 인프라 비용도 70% 이상 절감했어요. 어드민 개선 TFT를 6개월간 리드해 만족도를 20% 이상 끌어올렸고, AI 코드 리뷰·스킬 기반 워크플로우도 팀에 정착시켰어요.",
  },
  {
    company: "라이프엑스",
    role: "프론트엔드 개발자",
    period: "2022.05 - 2023.11",
    url: "https://humanscape.io/kr/index.html",
    description:
      "희귀 난치병 환자 데이터 관리 솔루션을 0에서 1까지 만들었어요. 10명 팀의 프론트엔드 메인 개발자로 기술 스택과 개발 환경을 처음부터 설계했고, 파트너 병원 5곳까지 확장한 화이트라벨링 구조도 구현했어요. 키보드 · 스크린리더 접근성과 Sentry 기반 모니터링도 같이 챙겼어요.",
  },
  {
    company: "바이브컴퍼니",
    role: "풀스택 개발자",
    period: "2020.02 - 2021.12",
    url: "https://www.vaiv.kr/",
    description:
      "AI 모델러 웹 인터페이스를 개발했어요. 10만 건 이상의 대용량 쿼리를 최적화해 평균 응답 시간을 10초에서 100ms로 줄였고, 6레이어였던 서버 구조도 3레이어로 단순화했어요.",
  },
];

export const sideProjects = [
  {
    name: "RideMap",
    tagline: "라이더용 지도 앱 · iOS App Store 운영 중",
    description:
      "바이크 라이더에게 필요한 장소(카페, 정비소, 뷰포인트 등)와 코스, 리뷰, 길찾기를 제공하는 앱이에요. 혼자 기획부터 개발·출시·운영까지 했어요. Expo(React Native) + Supabase로 만들었고, PostGIS 반경 검색과 OTA 배포를 적용했어요.",
    url: "https://apps.apple.com/app/id6773636183",
  },
  {
    name: "기술 블로그",
    tagline: "seung-woo.me · 직접 설계·개발·운영",
    description:
      "지금 보고 계신 블로그예요. Next.js + Cloudflare(Pages·D1·R2·Vectorize) Edge 아키텍처로 직접 설계했고, 글을 학습한 Claude API RAG 챗봇과 시맨틱 검색을 붙였어요.",
    url: "https://www.seung-woo.me",
  },
];
