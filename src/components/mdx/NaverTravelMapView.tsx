"use client";

import { useEffect, useRef } from "react";

type MarkerClusteringOptions = {
  minClusterSize?: number;
  maxZoom?: number;
  map: naver.maps.Map;
  markers: naver.maps.Marker[];
  disableClickZoom?: boolean;
  gridSize?: number;
  icons: naver.maps.HtmlIcon[];
  indexGenerator: number[];
  stylingFunction: (clusterMarker: naver.maps.Marker, count: number) => void;
};

declare global {
  interface Window {
    naver: typeof naver;
    MarkerClustering?: new (options: MarkerClusteringOptions) => unknown;
  }
}

export type NaverTravelPlace = { name: string; lat: number; lng: number; place?: string };

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

// 구글 TravelMap과 같은 보라 핀 / 청록 클러스터로 통일한다.
const ACCENT = "#7c3aed";
const CLUSTER_COLOR = "#0d9488";
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

        const markers = list.map((p, i) => {
          const position = new naver.maps.LatLng(p.lat, p.lng);
          bounds.extend(position);
          const marker = new naver.maps.Marker({
            position,
            title: p.name,
            icon: {
              content: `<svg width="48" height="48" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${ACCENT}" stroke="#fff" stroke-width="1.5"/><text x="12" y="11.4" font-size="6" font-weight="700" fill="#fff" text-anchor="middle">${i + 1}</text></svg>`,
              anchor: new naver.maps.Point(24, 44),
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
          new window.MarkerClustering({
            minClusterSize: 2,
            maxZoom: 13,
            map,
            markers,
            disableClickZoom: false,
            gridSize: 120,
            icons: [
              {
                content: `<div style="width:40px;height:40px;background:${CLUSTER_COLOR};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
                size: new naver.maps.Size(40, 40),
                anchor: new naver.maps.Point(20, 20),
              },
            ],
            indexGenerator: [10],
            stylingFunction: (clusterMarker, count) => {
              const badge = clusterMarker.getElement().querySelector("div");
              if (badge) badge.textContent = String(count);
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
