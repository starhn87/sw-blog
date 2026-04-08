"use client";

import dynamic from "next/dynamic";

export const CommentSectionLazy = dynamic(
  () => import("./CommentSection").then((m) => m.CommentSection),
  { ssr: false },
);
