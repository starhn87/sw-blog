export const skillCategories = [
  {
    label: "Frontend",
    skills: [
      { name: "TypeScript", url: "https://www.typescriptlang.org" },
      { name: "React", url: "https://react.dev" },
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
      { name: "GraphQL", url: "https://graphql.org" },
      { name: "Drizzle", url: "https://orm.drizzle.team" },
      { name: "SQLite", url: "https://www.sqlite.org" },
    ],
  },
  {
    label: "Infra & Tools",
    skills: [
      { name: "Cloudflare", url: "https://www.cloudflare.com" },
      { name: "Vercel", url: "https://vercel.com" },
      { name: "Claude", url: "https://claude.ai" },
    ],
  },
];

export const skills = skillCategories.flatMap((c) => c.skills.map((s) => s.name));

export const careers = [
  {
    company: "크리에이트립",
    role: "프론트엔드 개발자",
    period: "2023.11 — 2026.02",
    url: "https://www.creatrip.com",
    description:
      "글로벌 여행 플랫폼(MAU 170만)에서 예약 퍼널을 단계 축소·모달 통합으로 다시 짜 전환률을 5% 이상 끌어올렸어요. SSG에서 SSR + CDN + SWR 구조로 옮기면서 서버 10대를 2대로 줄였고, 인프라 비용도 70% 이상 절감했어요. 어드민 개선 TFT를 6개월간 리드해 만족도를 20% 이상 끌어올렸고, AI 코드 리뷰·MCP 기반 워크플로우도 팀에 정착시켰어요.",
  },
  {
    company: "휴먼스케이프",
    role: "프론트엔드 개발자",
    period: "2022.05 — 2023.11",
    url: "https://humanscape.io/kr/index.html",
    description:
      "희귀 난치병 환자 데이터 관리 솔루션을 0에서 1까지 만들었어요. 10명 팀의 프론트엔드 메인 개발자로 기술 스택과 개발 환경을 처음부터 설계했고, 파트너 병원 5곳까지 확장한 화이트라벨링 구조도 구현했어요. 키보드 · 스크린리더 접근성과 Sentry 기반 모니터링도 같이 챙겼어요.",
  },
  {
    company: "바이브컴퍼니",
    role: "풀스택 개발자",
    period: "2020.02 — 2021.12",
    url: "https://www.vaiv.kr/",
    description:
      "AI 모델러 웹 인터페이스를 개발했어요. 10만 건 이상의 대용량 쿼리를 최적화해 평균 응답 시간을 10초에서 100ms로 줄였고, 6레이어였던 서버 구조도 3레이어로 단순화했어요.",
  },
];
