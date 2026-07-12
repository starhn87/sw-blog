"use client";

import { useEffect, useRef } from "react";
import {
  placePinSvg,
  clusterSvg,
  PIN_ANCHOR,
  CLUSTER_SIZE,
  type PlaceCategory,
} from "@/components/mdx/travelMarkers";

type MarkerClusteringOptions = {
  minClusterSize?: number;
  maxZoom?: number;
  map: naver.maps.Map;
  markers: naver.maps.Marker[];
  disableClickZoom?: boolean;
  gridSize?: number;
  icons: naver.maps.HtmlIcon[];
  indexGenerator: number[];
  stylingFunction: (
    clusterMarker: naver.maps.Marker,
    count: number,
    cluster: { getClusterMember: () => naver.maps.Marker[] },
  ) => void;
};

declare global {
  interface Window {
    naver: typeof naver;
    MarkerClustering?: new (options: MarkerClusteringOptions) => unknown;
  }
}

export type NaverTravelPlace = {
  name: string;
  lat: number;
  lng: number;
  place?: string;
  category?: PlaceCategory;
};

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

// 이 줌 이하에서만 마커를 묶는다(초과하면 개별). 클릭 시엔 이 값 위로 단번에 확대해 갈라지게 한다.
const CLUSTER_MAX_ZOOM = 13;
// InfoWindow 링크 버튼: 흰 배경에서 잘 보이는 진한 브랜드 파랑(구글 InfoWindow와 동일).
const LINK_COLOR = "hsl(207 44% 46%)";

function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(script);
  });
}

// 스크립트는 각각 한 번만 로드한다(지도가 여러 개여도 중복 로드 방지).
let naverMapsPromise: Promise<void> | null = null;
function loadNaverMaps(): Promise<void> {
  if (!naverMapsPromise) {
    naverMapsPromise = loadScript(
      `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}`,
      () => !!window.naver?.maps,
    );
  }
  return naverMapsPromise;
}

let clusteringPromise: Promise<void> | null = null;
function loadClustering(): Promise<void> {
  if (!clusteringPromise) {
    // 네이버 공식 marker-tools의 MarkerClustering(npm 미제공)을 자체 호스팅해 쓴다.
    clusteringPromise = loadScript("/naver-marker-clustering.js", () => !!window.MarkerClustering);
  }
  return clusteringPromise;
}

export default function NaverTravelMapView({ places }: { places: NaverTravelPlace[] }) {
  const holder = useRef<HTMLDivElement>(null);
  // 매 렌더 새 배열이 들어와도 지도가 다시 그려지지 않도록 내용으로 고정한다.
  const placesJson = JSON.stringify(places);

  useEffect(() => {
    const el = holder.current;
    const list: NaverTravelPlace[] = JSON.parse(placesJson);
    if (!el || list.length === 0) return;
    let cancelled = false;

    loadNaverMaps()
      .then(() => loadClustering())
      .then(() => {
        if (cancelled || !el) return;
        const { naver } = window;

        const map = new naver.maps.Map(el, {
          zoom: 11,
          minZoom: 6,
          mapDataControl: false,
          scaleControl: false,
          logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT },
        });

        const first = new naver.maps.LatLng(list[0].lat, list[0].lng);
        const bounds = new naver.maps.LatLngBounds(first, first);
        const info = new naver.maps.InfoWindow({
          content: "",
          borderWidth: 0,
          backgroundColor: "#fff",
          pixelOffset: new naver.maps.Point(0, -6),
        });

        const markers = list.map((p) => {
          const position = new naver.maps.LatLng(p.lat, p.lng);
          bounds.extend(position);
          // 카테고리(맛집·카페·관광 등)별 색·아이콘 핀. 방문 번호 대신 장소 성격을 보여준다.
          const marker = new naver.maps.Marker({
            position,
            title: p.name,
            icon: {
              // 인라인 SVG의 filter id 충돌을 피하려고 그림자는 CSS로 준다(모듈 주석 참고).
              content: `<div style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">${placePinSvg(p.category, false)}</div>`,
              anchor: new naver.maps.Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
            },
          });
          naver.maps.Event.addListener(marker, "click", () => {
            const link = p.place ? `https://map.naver.com/p/entry/place/${p.place}` : "";
            const linkBtn = link
              ? `<a href="${link}" target="_blank" rel="noopener" aria-label="네이버 지도에서 열기" title="네이버 지도에서 열기" style="flex:none;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:hsl(207 44% 46% / 0.16);color:${LINK_COLOR};text-decoration:none"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg></a>`
              : "";
            info.setContent(
              `<div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',Roboto,sans-serif;display:flex;gap:10px;align-items:center;padding:8px 10px;font-size:13px;max-width:240px"><div style="font-weight:600;color:#000">${p.name}</div>${linkBtn}</div>`,
            );
            info.open(map, marker);
          });
          return marker;
        });

        map.fitBounds(bounds, { top: 52, right: 52, bottom: 52, left: 52 });
        naver.maps.Event.addListener(map, "click", () => info.close());

        // 겹치는 마커는 청록 배지로 묶고, 클릭·확대하면 개별 핀으로 풀린다.
        if (window.MarkerClustering) {
          const bound = new WeakSet<naver.maps.Marker>();
          const clusterOf = new WeakMap<naver.maps.Marker, { getClusterMember: () => naver.maps.Marker[] }>();
          new window.MarkerClustering({
            minClusterSize: 2,
            maxZoom: CLUSTER_MAX_ZOOM,
            map,
            markers,
            // 기본 클릭 확대는 +1단계뿐이라 밀집 클러스터가 안 갈라진다. 클릭 시 해제 줌 위로 단번에 확대한다.
            disableClickZoom: true,
            gridSize: 120,
            icons: [
              {
                // 청록 원 + 반투명 헤일로 링: 개별 핀과 구분되는 '여러 장소 묶음' 신호.
                content: `<div style="position:relative;width:${CLUSTER_SIZE}px;height:${CLUSTER_SIZE}px">${clusterSvg()}<div class="mc-count" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700"></div></div>`,
                size: new naver.maps.Size(CLUSTER_SIZE, CLUSTER_SIZE),
                anchor: new naver.maps.Point(CLUSTER_SIZE / 2, CLUSTER_SIZE / 2),
              },
            ],
            indexGenerator: [10],
            stylingFunction: (clusterMarker, count, cluster) => {
              const badge = clusterMarker.getElement().querySelector(".mc-count");
              if (badge) badge.textContent = String(count);
              // 멤버 최대 간격이 격자 크기(gridSize 120px)를 막 넘는 '엄밀한 최소 해제 줌'까지만
              // morph로 부드럽게 확대한다(같은 격자 셀이어야 묶이므로 간격이 격자보다 크면 해제 보장).
              // 라이브러리 getBounds()는 '첫 마커 + gridSize'라 부정확해서 멤버들로 직접 중심을 구한다.
              // 클러스터 마커는 재사용될 수 있어 최신 cluster를 WeakMap에 담아 클릭 시 참조한다.
              clusterOf.set(clusterMarker, cluster);
              if (!bound.has(clusterMarker)) {
                bound.add(clusterMarker);
                naver.maps.Event.addListener(clusterMarker, "click", () => {
                  const members = clusterOf.get(clusterMarker)?.getClusterMember() ?? [];
                  if (members.length < 2) return;
                  const first = members[0].getPosition() as naver.maps.LatLng;
                  const b = new naver.maps.LatLngBounds(first, first);
                  // 웹 메르카토르 월드 좌표(줌 0, 256px 기준). 줌 z에서의 픽셀 간격 = 월드 간격 × 2^z.
                  const w = members.map((m) => {
                    const p = m.getPosition() as naver.maps.LatLng;
                    b.extend(p);
                    const s = Math.sin((p.lat() * Math.PI) / 180);
                    return [
                      ((p.lng() + 180) / 360) * 256,
                      (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256,
                    ];
                  });
                  let span = 0;
                  for (let a = 0; a < w.length; a++)
                    for (let c = a + 1; c < w.length; c++)
                      span = Math.max(span, Math.hypot(w[a][0] - w[c][0], w[a][1] - w[c][1]));
                  const zSplit =
                    span > 0 ? Math.floor(Math.log2(120 / span)) + 1 : CLUSTER_MAX_ZOOM + 1;
                  const targetZoom = Math.min(
                    Math.max(zSplit, map.getZoom() + 1),
                    CLUSTER_MAX_ZOOM + 1,
                  );
                  map.morph(b.getCenter(), targetZoom, { duration: 800, easing: "easeOutCubic" });
                });
              }
            },
          });
        } else {
          markers.forEach((m) => m.setMap(map));
        }
      })
      .catch(() => {
        if (el)
          el.innerHTML =
            '<div style="display:flex;height:100%;align-items:center;justify-content:center;font-size:14px;color:#888">지도를 불러오지 못했어요</div>';
      });

    return () => {
      cancelled = true;
    };
  }, [placesJson]);

  return (
    <div
      ref={holder}
      className="not-prose my-6 h-[360px] w-full overflow-hidden rounded-lg border border-border md:h-[420px]"
      aria-label="방문 장소 지도"
    />
  );
}
