"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github, Mail } from "lucide-react";

const skills = [
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "Zustand",
  "GraphQL",
  "Storybook",
  "Turborepo",
];

const careers = [
  {
    company: "크리에이트립",
    role: "프론트엔드 개발자",
    period: "2023.11 — 2026.02",
    description:
      "글로벌 여행 플랫폼(MAU 170만, PV 450만) 개발. Core Web Vitals Good URL 비율 개선(3% → 80%). SEO 점수(Lighthouse) 평균 90점 이상 달성. 로딩 성능 최적화. SWR 연계 CDN 캐싱 전략으로 인프라 비용 대폭 절감. 어드민 개선 TFT 리드.",
  },
  {
    company: "휴먼스케이프",
    role: "프론트엔드 개발자",
    period: "2022.05 — 2023.11",
    description:
      "희귀 난치병 환자 데이터 관리 솔루션(레어데이터) 0 to 1 개발. 웹 접근성 준수, 화이트 라벨링, Sentry 기반 모니터링 체계 구축.",
  },
  {
    company: "바이브컴퍼니",
    role: "풀스택 개발자",
    period: "2020.02 — 2021.12",
    description:
      "AI 모델러 웹 인터페이스 개발. 10만+ 건 대용량 쿼리 최적화, 서버 구조 6레이어 → 3레이어 단순화.",
  },
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function AboutContent() {
  return (
    <motion.div
      className="flex flex-col gap-12"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* 인트로 */}
      <motion.section variants={item}>
        <h1 className="mb-4 text-3xl font-bold tracking-tight">About</h1>
        <p className="text-lg text-muted-foreground">
          안녕하세요, 개발자 이승우예요.
        </p>
        <p className="mt-2 leading-relaxed text-foreground/80">
          성능과 UX에 진심이에요. 글로벌 서비스부터 0 to 1 프로덕트까지, 6년간
          다양한 환경에서 프로덕트를 만들어왔어요. 요즘은 AI를 활용한 개발
          생산성 향상에도 관심이 많아요.
        </p>
      </motion.section>

      {/* 경력 */}
      <motion.section variants={item}>
        <h2 className="mb-6 text-xl font-semibold">Career</h2>
        <div className="flex flex-col gap-6">
          {careers.map((career) => (
            <div
              key={career.company}
              className="rounded-lg border border-border p-5"
            >
              <div className="mb-1 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{career.company}</span>
                  <span className="text-sm text-muted-foreground">
                    {career.role}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {career.period}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {career.description}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 기술 스택 */}
      <motion.section variants={item}>
        <h2 className="mb-4 text-xl font-semibold">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-border px-3 py-1 text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </motion.section>

      {/* 관심사 */}
      <motion.section variants={item}>
        <h2 className="mb-4 text-xl font-semibold">Interests</h2>
        <p className="leading-relaxed text-foreground/80">
          코드 밖에서는 오토바이 라이딩과 위스키를 즐겨요. 바람을 가르며 달리는
          것도, 한 잔의 위스키를 음미하는 것도 좋아해요.
        </p>
      </motion.section>

      {/* 블로그 소개 */}
      <motion.section variants={item}>
        <h2 className="mb-4 text-xl font-semibold">This Blog</h2>
        <p className="leading-relaxed text-foreground/80">
          개발, 여행, 일상 — 기록하고 싶은 것을 자유롭게 담는 공간이에요. Next.js
          15, MDX, Cloudflare D1으로 직접 만들었고, AI 챗봇도 붙여뒀어요.
        </p>
      </motion.section>

      {/* 링크 */}
      <motion.section variants={item}>
        <h2 className="mb-4 text-xl font-semibold">Links</h2>
        <div className="flex gap-4">
          <a
            href="https://github.com/starhn87"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github size={16} />
            GitHub
          </a>
          <a
            href="mailto:starhn87@gmail.com"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail size={16} />
            Email
          </a>
          <a
            href="https://www.notion.so/Jimmy-d0f1d7dec7b247e58947d2bcd4f58dab"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink size={16} />
            Portfolio
          </a>
        </div>
      </motion.section>
    </motion.div>
  );
}
