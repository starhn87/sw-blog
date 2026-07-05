"use client";

import { useEffect } from "react";

// TOC(앵커)를 클릭하면 URL hash가 바뀌므로 그 소제목을 대상으로 기억해뒀다가,
// scrollend(smooth 스크롤이 완전히 멈춘 시점)에 그 소제목만 하이라이트한다.
// 일반 스크롤로 지나가는 소제목에는 효과를 주지 않는다.
export default function HeadingHighlight() {
  useEffect(() => {
    let targetId: string | null = null;

    const onHashChange = () => {
      if (location.hash) targetId = decodeURIComponent(location.hash.slice(1));
    };

    // 모바일 TOC는 앵커 기본 동작(hash 변경)을 막고 JS로 스크롤하므로,
    // 커스텀 이벤트로 대상 소제목을 전달받는다.
    const onTocNavigate = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) targetId = detail;
    };

    const onScrollEnd = () => {
      if (!targetId) return;
      const el = document.getElementById(targetId);
      targetId = null;
      if (!el) return;
      // 같은 소제목을 다시 클릭해도 애니메이션이 재실행되도록 클래스를 리셋한다(reflow 강제).
      el.classList.remove("heading-in-view");
      void el.offsetWidth;
      el.classList.add("heading-in-view");
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("toc:navigate", onTocNavigate);
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("toc:navigate", onTocNavigate);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, []);

  return null;
}
