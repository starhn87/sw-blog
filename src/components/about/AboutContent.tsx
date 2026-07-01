"use client";

import { motion } from "framer-motion";
import { ExternalLink, Mail } from "lucide-react";
import {
  skillCategories,
  careers,
  highlights,
  sideProjects,
} from "@/data/about";

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
          안녕하세요 개발자 이승우예요.
        </p>
        <p className="mt-2 leading-relaxed text-foreground/80">
          빠르고 가벼우면서도 사용자의 니즈를 관통하는 서비스를 추구해요.
        </p>
        <p className="mt-2 leading-relaxed text-foreground/80">
          6년간 글로벌 서비스부터 0 to 1 프로덕트까지 다양한 환경에서 프로덕트를
          만들어왔어요. 기능을 더하는 일만큼 무엇을 빼야 더 빨라지는지 고민하는 데
          시간을 써요.
        </p>
        <p className="mt-2 leading-relaxed text-foreground/80">
          AI로 구현 시간이 단축되는 만큼, 판단과 설계에 더 많은 비중을 두려고 해요.
        </p>
      </motion.section>

      {/* 핵심 성과 */}
      <motion.section variants={item}>
        <h2 className="mb-6 text-xl font-semibold">Highlights</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {highlights.map((h) => (
            <div key={h.label} className="rounded-lg border border-border p-5">
              <div className="text-2xl font-bold text-brand">{h.value}</div>
              <div className="mt-1 font-medium">{h.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {h.detail}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 경력 타임라인 */}
      <motion.section variants={item}>
        <h2 className="mb-6 text-xl font-semibold">Career</h2>
        <div className="relative flex flex-col gap-0 pl-6">
          {/* 타임라인 세로선 */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
          {careers.map((career) => (
            <motion.a
              key={career.company}
              href={career.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="group relative block pb-8 last:pb-0"
            >
              {/* 타임라인 점 */}
              <div className="absolute -left-6 top-2 flex items-center justify-center">
                <div className="size-[15px] rounded-full border-2 border-brand bg-background transition-colors group-hover:bg-brand" />
              </div>
              <div className="rounded-lg border border-border p-5 transition-all duration-300 group-hover:border-brand/30 group-hover:shadow-lg group-hover:shadow-brand/5">
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
            </motion.a>
          ))}
        </div>
      </motion.section>

      {/* 사이드 프로젝트 */}
      <motion.section variants={item}>
        <h2 className="mb-6 text-xl font-semibold">Side Projects</h2>
        <div className="flex flex-col gap-4">
          {sideProjects.map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg border border-border p-5 transition-all duration-300 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{project.name}</span>
                <ExternalLink
                  size={14}
                  className="text-muted-foreground transition-colors group-hover:text-brand"
                />
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {project.tagline}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {project.description}
              </p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          이 블로그엔 내용을 기반으로 답변하는 AI 챗봇도 붙여뒀으니 궁금한 게
          있으시면 오른쪽 아래 말풍선을 눌러보세요.
        </p>
      </motion.section>

      {/* 기술 스택 */}
      <motion.section variants={item}>
        <h2 className="mb-6 text-xl font-semibold">Skills</h2>
        <div className="flex flex-col gap-5">
          {skillCategories.map((category) => (
            <div key={category.label}>
              <h3 className="mb-2.5 text-sm font-medium text-muted-foreground">
                {category.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <a
                    key={skill.name}
                    href={skill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-sm transition-all duration-200 hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
                  >
                    {skill.name}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 관심사 */}
      <motion.section variants={item}>
        <h2 className="mb-4 text-xl font-semibold">Interests</h2>
        <p className="leading-relaxed text-foreground/80">
          코드 밖에서는 바이크 라이딩으로 바람을 가르면서 스트레스를 풀고 여행을
          떠나는 것도 좋아해요.
        </p>
      </motion.section>

      {/* CTA */}
      <motion.section
        variants={item}
        className="rounded-lg border border-brand/20 bg-brand/5 p-8 text-center dark:bg-brand/10"
      >
        <h2 className="mb-2 text-xl font-semibold">연락하고 싶으시다면</h2>
        <p className="mb-6 text-muted-foreground">언제든 편하게 말씀해 주세요.</p>
        <div className="flex justify-center gap-3">
          <a
            href="mailto:starhn87@gmail.com"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Mail size={16} />
            Email
          </a>
          <a
            href="https://www.notion.so/Jimmy-d0f1d7dec7b247e58947d2bcd4f58dab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink size={16} />
            Portfolio
          </a>
        </div>
      </motion.section>
    </motion.div>
  );
}
