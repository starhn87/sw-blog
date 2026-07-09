"use client";

import dynamic from "next/dynamic";

// Leaflet은 window에 의존하므로 클라이언트에서만 로드한다.
const TravelMap = dynamic(() => import("./TravelMapView"), {
  ssr: false,
  loading: () => (
    <div className="my-6 h-[360px] w-full animate-pulse rounded-lg bg-muted md:h-[420px]" />
  ),
});

export default TravelMap;
