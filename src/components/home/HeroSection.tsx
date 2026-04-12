"use client";

import { useEffect, useState } from "react";

const keywords = ["개발", "여행", "일상"];

export function HeroSection() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase("exit");
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % keywords.length);
        setPhase("enter");
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-10">
      <h1 className="text-3xl font-bold sm:text-4xl">
        <span className="block">안녕하세요 이승우입니다.</span>
        <span className="block mt-1">
          <span
            key={index}
            className="inline-block bg-gradient-to-r from-brand to-sky-400 bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-200"
            style={{
              animation:
                phase === "enter"
                  ? "keyword-enter 0.4s ease-out both"
                  : "keyword-exit 0.4s ease-out both",
            }}
          >
            {keywords[index]}
          </span>
          <span>을 기록합니다.</span>
        </span>
      </h1>
      <p className="text-lg text-muted-foreground">
        코드로 짓고 이야기로 채우는 공간
      </p>
    </div>
  );
}
