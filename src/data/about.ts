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
      "글로벌 여행 플랫폼(MAU 170만)의 웹 성능을 개선했어요. Core Web Vitals Good URL 비율을 3%에서 80%로 끌어올렸고, SWR 연계 CDN 캐싱 전략으로 인프라 비용을 대폭 절감했어요. 어드민 개선 TFT를 리드하기도 했어요.",
  },
  {
    company: "휴먼스케이프",
    role: "프론트엔드 개발자",
    period: "2022.05 — 2023.11",
    url: "https://humanscape.io/kr/index.html",
    description:
      "희귀 난치병 환자 데이터 관리 솔루션을 처음부터 설계하고 만들었어요. 웹 접근성을 준수하면서 화이트 라벨링 구조를 구현했고, Sentry 기반 모니터링 체계도 구축했어요.",
  },
  {
    company: "바이브컴퍼니",
    role: "풀스택 개발자",
    period: "2020.02 — 2021.12",
    url: "https://www.vaiv.kr/",
    description:
      "AI 모델러 웹 인터페이스를 개발했어요. 10만 건 이상의 대용량 쿼리를 최적화했고, 서버 구조를 6레이어에서 3레이어로 단순화했어요.",
  },
];
