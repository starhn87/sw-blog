"use client";

export function ImageZoomModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "이미지 확대"}
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/80 p-8"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
      />
    </div>
  );
}
