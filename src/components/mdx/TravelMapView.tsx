"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

export type TravelPlace = { name: string; lat: number; lng: number };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// 물방울 핀(24x24 기준). 끝점 anchor (12,22), 번호는 원 중심 (12,9).
const PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

// 지도에서 또렷하게 튀는 쨍한 보라 계열.
const ACCENT = "#7c3aed";
// 클러스터 배지는 개별 핀(보라)과 헷갈리지 않게 청록으로 구분한다.
const CLUSTER_COLOR = "#0d9488";

// colorScheme은 런타임 전환이 안 되므로, 테마 토글 시 setOptions로 바꿀 수 있는 styles를 쓴다.
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

export default function TravelMapView({ places }: { places: TravelPlace[] }) {
  const holder = useRef<HTMLDivElement>(null);
  // MDX가 매 렌더 새 배열을 넘겨 useEffect가 재실행되며 지도가 깜빡이지 않도록 내용으로 고정한다.
  const placesJson = JSON.stringify(places);

  useEffect(() => {
    const el = holder.current;
    const list: TravelPlace[] = JSON.parse(placesJson);
    if (!el || list.length === 0) return;

    let observer: MutationObserver | undefined;
    let cancelled = false;
    const isDark = () => document.documentElement.classList.contains("dark");
    const theme = () => (isDark() ? DARK_STYLE : null);

    setOptions({ key: API_KEY, v: "weekly" });

    (async () => {
      const { Map, InfoWindow } = await importLibrary("maps");
      const { Marker } = await importLibrary("marker");
      const { LatLngBounds, Point } = await importLibrary("core");
      const { Place } = await importLibrary("places");
      if (cancelled) return;

      const path = list.map((p) => ({ lat: p.lat, lng: p.lng }));
      const map = new Map(el, {
        styles: theme() ?? undefined,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });

      const bounds = new LatLngBounds();
      const info = new InfoWindow();
      const markers = list.map((p, i) => {
        const marker = new Marker({
          position: path[i],
          icon: {
            path: PIN_PATH,
            fillColor: ACCENT,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 2,
            anchor: new Point(12, 22),
            labelOrigin: new Point(12, 9),
          },
          label: { text: String(i + 1), color: "#ffffff", fontSize: "11px", fontWeight: "700" },
          title: p.name,
        });
        bounds.extend(path[i]);
        marker.addListener("click", async () => {
          // 구글 장소 정보(주소·링크)를 먼저 받아 완성본을 한 번에 띄운다(이름만 깜빡이지 않게).
          let content = `<div style="font-size:13px;font-weight:600;color:#000">${p.name}</div>`;
          try {
            const { places: found } = await Place.searchByText({
              textQuery: p.name,
              fields: ["formattedAddress", "googleMapsURI"],
              locationBias: { lat: p.lat, lng: p.lng },
              maxResultCount: 1,
              language: "ko",
            });
            const place = found[0];
            // 전각 숫자·기호(１０−１ 등)를 반각으로 바꾸고, 얇게 fallback되는 한글만 살짝 굵게(450) 보정한다.
            const addr = (place?.formattedAddress ?? "")
              .normalize("NFKC")
              .replace(/[가-힣]+/g, (m) => `<span style="font-weight:450">${m}</span>`);
            const uri = place?.googleMapsURI ?? "";
            const linkBtn = uri
              ? `<a href="${uri}" target="_blank" rel="noopener" aria-label="구글 지도에서 열기" title="구글 지도에서 열기" style="flex:none;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:hsl(207 44% 46% / 0.16);color:hsl(207 44% 46%);text-decoration:none"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg></a>`
              : "";
            content = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',Roboto,sans-serif;display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.5;max-width:260px">
<div style="min-width:0">
<div style="font-weight:600;color:#000">${p.name}</div>
${addr ? `<div style="color:#111;font-size:12px;margin-top:2px">${addr}</div>` : ""}
</div>
${linkBtn}
</div>`;
          } catch {
            // 검색 실패 시 이름만
          }
          info.setContent(content);
          info.open({ map, anchor: marker });
        });
        return marker;
      });

      map.fitBounds(bounds, 48);

      // 가까운 마커는 개수 배지로 묶고, 클릭·확대하면 개별 핀으로 풀린다.
      new MarkerClusterer({
        map,
        markers,
        // fitBounds는 줌 변화가 크면(밀집 클러스터) 애니메이션 없이 점프한다. 목표 줌·중심을 구한 뒤
        // 원위치로 되돌리고 setZoom(구글 setZoom은 부드러운 줌 애니메이션)+panTo로 부드럽게 이동한다.
        // 원복은 동기 실행이라 중간 상태가 렌더되지 않아 깜빡이지 않는다.
        onClusterClick: (_event, cluster) => {
          if (!cluster.bounds) return;
          const startZoom = map.getZoom() ?? 6;
          const startCenter = map.getCenter();
          map.fitBounds(cluster.bounds, 96);
          const targetZoom = map.getZoom() ?? startZoom;
          const targetCenter = map.getCenter();
          if (!startCenter || !targetCenter) return;
          map.setZoom(startZoom);
          map.setCenter(startCenter);
          map.setZoom(targetZoom);
          map.panTo(targetCenter);
        },
        renderer: {
          render: ({ count, position }) =>
            new Marker({
              position,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: CLUSTER_COLOR,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
                scale: 20,
              },
              label: { text: String(count), color: "#ffffff", fontSize: "14px", fontWeight: "700" },
              zIndex: Number.MAX_SAFE_INTEGER,
            }),
        },
      });

      // 지도의 빈 곳을 클릭하면 열려 있는 말풍선을 닫는다.
      map.addListener("click", () => info.close());

      // 테마 토글 시 지도 스타일도 라이트/다크로 바꿔준다. 다크 여부가 실제로 달라질 때만
      // setOptions를 불러 불필요한 타일 리로드를 막는다.
      let lastDark = isDark();
      observer = new MutationObserver(() => {
        const dark = isDark();
        if (dark === lastDark) return;
        lastDark = dark;
        map.setOptions({ styles: theme() ?? undefined });
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    })().catch(() => {
      el.innerHTML =
        '<div style="display:flex;height:100%;align-items:center;justify-content:center;font-size:14px;color:#888">지도를 불러오지 못했어요</div>';
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
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
