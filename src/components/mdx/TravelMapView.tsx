"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import {
  placePinDataUrl,
  clusterDataUrl,
  PIN_SIZE,
  PIN_ANCHOR,
  CLUSTER_SIZE,
  type PlaceCategory,
} from "@/components/mdx/travelMarkers";

export type TravelPlace = { name: string; lat: number; lng: number; category?: PlaceCategory };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// 기본 POI·역 아이콘을 숨겨 우리 장소 마커만 남긴다(장소명 텍스트 라벨은 유지).
const POI_ICONS_OFF: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

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
    const theme = () => (isDark() ? [...DARK_STYLE, ...POI_ICONS_OFF] : POI_ICONS_OFF);

    setOptions({ key: API_KEY, v: "weekly" });

    (async () => {
      const { Map, InfoWindow } = await importLibrary("maps");
      const { Marker } = await importLibrary("marker");
      const { LatLngBounds, Point, Size } = await importLibrary("core");
      const { Place } = await importLibrary("places");
      if (cancelled) return;

      const path = list.map((p) => ({ lat: p.lat, lng: p.lng }));
      const map = new Map(el, {
        styles: theme(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
        // 클러스터 클릭 줌을 소수점 단위로 보간(moveCamera)하기 위해 필요하다.
        isFractionalZoomEnabled: true,
      });

      const bounds = new LatLngBounds();
      const info = new InfoWindow();
      const markers = list.map((p, i) => {
        const marker = new Marker({
          position: path[i],
          // 카테고리(맛집·카페·관광 등)별 색·아이콘 핀. 방문 번호 대신 장소 성격을 보여준다.
          icon: {
            url: placePinDataUrl(p.category),
            scaledSize: new Size(PIN_SIZE, PIN_SIZE),
            anchor: new Point(PIN_ANCHOR.x, PIN_ANCHOR.y),
          },
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
      // setZoom은 줌 변화가 크면 스냅하고, 단계별 setZoom은 단계 사이가 멈칫한다. moveCamera로
      // 소수점 줌·중심을 rAF마다 보간하면 한 번의 연속 애니메이션이 된다. 새 클릭이 오면
      // 토큰으로 이전 시퀀스를 중단한다.
      let zoomToken = 0;
      const smoothZoomTo = (center: google.maps.LatLng, targetZoom: number) => {
        const token = ++zoomToken;
        const startZoom = map.getZoom() ?? targetZoom;
        const startCenter = map.getCenter();
        if (!startCenter) return;
        const duration = Math.min(450 + Math.abs(targetZoom - startZoom) * 170, 1500);
        const startAt = performance.now();
        const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const frame = (now: number) => {
          if (token !== zoomToken) return;
          const t = Math.min((now - startAt) / duration, 1);
          const k = ease(t);
          map.moveCamera({
            center: {
              lat: startCenter.lat() + (center.lat() - startCenter.lat()) * k,
              lng: startCenter.lng() + (center.lng() - startCenter.lng()) * k,
            },
            zoom: startZoom + (targetZoom - startZoom) * k,
          });
          if (t < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      };
      // 웹 메르카토르 월드 좌표(줌 0, 256px 기준). 줌 z에서의 픽셀 간격 = 월드 간격 × 2^z.
      const worldPx = (lat: number, lng: number): [number, number] => {
        const s = Math.sin((lat * Math.PI) / 180);
        return [
          ((lng + 180) / 360) * 256,
          (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256,
        ];
      };
      new MarkerClusterer({
        map,
        markers,
        // 멤버 최대 간격이 SuperCluster 반경(60px)을 막 넘는 '엄밀한 최소 해제 줌'까지만 확대한다.
        onClusterClick: (_event, cluster) => {
          const pts = (cluster.markers ?? [])
            .map((m) => (m as google.maps.Marker).getPosition())
            .filter((p): p is google.maps.LatLng => !!p);
          if (pts.length < 2 || !cluster.bounds) return;
          const w = pts.map((p) => worldPx(p.lat(), p.lng()));
          let span = 0;
          for (let a = 0; a < w.length; a++)
            for (let b = a + 1; b < w.length; b++)
              span = Math.max(span, Math.hypot(w[a][0] - w[b][0], w[a][1] - w[b][1]));
          // span×2^z > 60 을 만족하는 최소 정수 줌. 겹친 좌표면 클러스터 한계(maxZoom 16) 위로.
          const zSplit = span > 0 ? Math.floor(Math.log2(60 / span)) + 1 : 17;
          const targetZoom = Math.min(Math.max(zSplit, (map.getZoom() ?? 6) + 1), 17);
          smoothZoomTo(cluster.bounds.getCenter(), targetZoom);
        },
        renderer: {
          // 청록 원 + 반투명 헤일로 링: 개별 핀과 구분되는 '여러 장소 묶음' 신호.
          render: ({ count, position }) =>
            new Marker({
              position,
              icon: {
                url: clusterDataUrl(),
                scaledSize: new Size(CLUSTER_SIZE, CLUSTER_SIZE),
                anchor: new Point(CLUSTER_SIZE / 2, CLUSTER_SIZE / 2),
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
        map.setOptions({ styles: theme() });
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
