"use client";

import dynamic from "next/dynamic";

export const ChatWidgetLazy = dynamic(
  () => import("@/components/chat/ChatWidget"),
  { ssr: false },
);
