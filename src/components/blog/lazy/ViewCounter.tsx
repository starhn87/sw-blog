"use client";

import dynamic from "next/dynamic";

export default dynamic(() => import("@/components/blog/ViewCounter"), { ssr: false });
