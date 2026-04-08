const SITE_ORIGIN = "https://www.seung-woo.me";
const WIDTHS = [320, 480, 640, 800, 960, 1200, 1600, 2000] as const;
const FORMAT = "avif";
const ZOOM_WIDTH = 2000;

function isOptimizable(src: string): boolean {
  if (!src) return false;
  if (src.includes("/cdn-cgi/image/")) return false;
  if (src.endsWith(".gif") || src.includes(".gif?")) return false;
  return src.startsWith("/api/media") || src.includes("/api/media?");
}

function toAbsolute(src: string): string {
  if (src.startsWith("http")) return src;
  if (src.startsWith("/")) return `${SITE_ORIGIN}${src}`;
  return `${SITE_ORIGIN}/${src}`;
}

function toRelativePath(src: string): string {
  if (src.startsWith("http")) {
    try {
      const url = new URL(src);
      return `${url.pathname}${url.search}`;
    } catch {
      return src;
    }
  }
  return src.startsWith("/") ? src : `/${src}`;
}

export function getOptimizedImageUrl(
  src: string,
  width: number,
  quality = 85,
): string {
  if (!isOptimizable(src)) return src;
  const path = toRelativePath(src);
  return `${SITE_ORIGIN}/cdn-cgi/image/width=${width},format=${FORMAT},quality=${quality}/${path.replace(/^\//, "")}`;
}

export function getImageSrcSet(src: string, quality = 85): string | undefined {
  if (!isOptimizable(src)) return undefined;
  return WIDTHS.map(
    (w) => `${getOptimizedImageUrl(src, w, quality)} ${w}w`,
  ).join(", ");
}

export function canOptimize(src: string): boolean {
  return isOptimizable(src);
}

// Uses the same parameters as the largest srcset variant so the CDN cache
// entry is shared between srcset and zoom.
export function getZoomImageUrl(src: string): string {
  return getOptimizedImageUrl(src, ZOOM_WIDTH);
}

export { toAbsolute };
