"use client";

import { useRef } from "react";

const MENTION_PATTERN = /\S+님/;

export function useMentionEditor() {
  const ref = useRef<HTMLDivElement>(null);

  const initRef =
    (content: string, autoFocus = false) =>
    (el: HTMLDivElement | null) => {
      if (el && !el.hasAttribute("data-initialized")) {
        const match = content.match(/^(\S+님)\s/);
        if (match) {
          el.innerHTML = `<strong>${match[1]}</strong> ${content.slice(match[1].length + 1)}`;
        } else {
          el.textContent = content;
        }
        el.setAttribute("data-initialized", "true");
        if (autoFocus) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

  const handleInput = () => {
    const el = ref.current;
    if (!el) return "";
    const strong = el.querySelector("strong");
    if (strong && !MENTION_PATTERN.test(strong.textContent ?? "")) {
      const text = el.textContent ?? "";
      const sel = window.getSelection();
      const offset = sel?.focusOffset ?? text.length;
      el.textContent = text;
      const range = document.createRange();
      range.setStart(el.firstChild ?? el, Math.min(offset, text.length));
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    return el.textContent?.trim() ?? "";
  };

  const getText = () => ref.current?.textContent?.trim() ?? "";

  const clear = () => {
    if (ref.current) ref.current.textContent = "";
  };

  return { ref, initRef, handleInput, getText, clear };
}
