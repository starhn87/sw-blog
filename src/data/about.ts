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
      "글로벌 여행 플랫폼(MAU 170만, PV 450만) 개발. Core Web Vitals Good URL 비율 개선(3% → 80%). SEO 점수(Lighthouse) 평균 90점 이상 달성. 로딩 성능 최적화. SWR 연계 CDN 캐싱 전략으로 인프라 비용 대폭 절감. 어드민 개선 TFT 리드.",
  },
  {
    company: "휴먼스케이프",
    role: "프론트엔드 개발자",
    period: "2022.05 — 2023.11",
    url: "https://humanscape.io/kr/index.html",
    description:
      "희귀 난치병 환자 데이터 관리 솔루션(레어데이터) 0 to 1 개발. 웹 접근성 준수, 화이트 라벨링, Sentry 기반 모니터링 체계 구축.",
  },
  {
    company: "바이브컴퍼니",
    role: "풀스택 개발자",
    period: "2020.02 — 2021.12",
    url: "https://www.vaiv.kr/",
    description:
      "AI 모델러 웹 인터페이스 개발. 10만+ 건 대용량 쿼리 최적화, 서버 구조 6레이어 → 3레이어 단순화.",
  },
];
