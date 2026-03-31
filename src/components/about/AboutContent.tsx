"use client";

import { motion } from "framer-motion";
import { ExternalLink, Mail } from "lucide-react";
import { skills, careers } from "@/data/about";

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
            <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
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
