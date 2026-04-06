export interface MediaItem {
  key: string;
  size: number;
  uploaded: string;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function isVideo(key: string) {
  return /\.(mp4|mov|webm|ogg|avi)$/i.test(key);
}
