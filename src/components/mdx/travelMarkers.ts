// 여행 지도(구글 TravelMap·네이버 NaverTravelMap) 공용 마커 디자인.
// 두 지도의 핀·클러스터가 항상 같은 모양을 갖도록 여기서만 정의한다.

export type PlaceCategory = "food" | "cafe" | "sight" | "shopping" | "stay" | "transit";

// 카테고리별 색 + 아이콘(lucide 아웃라인 path, 24x24 기준).
const CATEGORIES: Record<PlaceCategory, { color: string; glyph: string }> = {
  food: {
    color: "#ea4335",
    glyph:
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  },
  cafe: {
    color: "#d97706",
    glyph:
      '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  },
  sight: {
    color: "#7c3aed",
    glyph:
      '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  },
  shopping: {
    color: "#2563eb",
    glyph:
      '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  },
  stay: {
    color: "#db2777",
    glyph: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  },
  transit: {
    color: "#64748b",
    glyph:
      '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 22-2-3"/>',
  },
};

// 클러스터: 청록 원 + 반투명 헤일로 링(여러 장소 묶음임을 알리는 신호).
export const CLUSTER_COLOR = "#0d9488";
export const PIN_SIZE = 56;
// viewBox(-2..26) 기준 핀 끝점 (12,22) → 픽셀 ((12+2)/28*56, (22+2)/28*56).
export const PIN_ANCHOR = { x: 28, y: 48 } as const;
export const CLUSTER_SIZE = 64;

const PIN_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

// 카테고리색 핀 + 흰 아이콘, 두꺼운 흰 테두리(56px). viewBox에 2단위 여백(그림자 공간).
// 그림자는 쓰임새별로 다르다: 구글(data URL·격리 문서)은 내장 feDropShadow, 네이버(인라인
// HTML)는 filter id가 문서 전역에서 충돌해 첫 SVG가 사라지면 나머지 그림자가 깨지므로
// withShadow=false로 받고 CSS drop-shadow로 감싼다.
export function placePinSvg(category?: PlaceCategory, withShadow = true): string {
  const { color, glyph } = CATEGORIES[category ?? "sight"];
  const shadow = withShadow
    ? `<filter id="tm-sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.45"/></filter>`
    : "";
  const pin = `<path d="${PIN_PATH}" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  return `<svg width="${PIN_SIZE}" height="${PIN_SIZE}" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg">${shadow}${withShadow ? `<g filter="url(#tm-sh)">${pin}</g>` : pin}<g transform="translate(8.16,4.96) scale(0.32)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`;
}

export function placePinDataUrl(category?: PlaceCategory): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(placePinSvg(category))}`;
}

// 개수 숫자는 각 지도 쪽(구글 label, 네이버 stylingFunction)에서 얹는다.
export function clusterSvg(): string {
  const c = CLUSTER_SIZE / 2;
  return `<svg width="${CLUSTER_SIZE}" height="${CLUSTER_SIZE}" viewBox="0 0 ${CLUSTER_SIZE} ${CLUSTER_SIZE}" xmlns="http://www.w3.org/2000/svg"><circle cx="${c}" cy="${c}" r="${c - 1}" fill="${CLUSTER_COLOR}" opacity="0.25"/><circle cx="${c}" cy="${c}" r="20" fill="${CLUSTER_COLOR}" stroke="#fff" stroke-width="2"/></svg>`;
}

export function clusterDataUrl(): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(clusterSvg())}`;
}
