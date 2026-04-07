"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Copy, Check, CheckSquare, Square, GripVertical, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVideo, formatSize, type MediaItem } from "./types";

export function SortableMediaItem({
  item,
  selectMode,
  selected,
  copiedKey,
  onToggle,
  onPreview,
  onCopy,
  onDelete,
}: {
  item: MediaItem;
  selectMode: boolean;
  selected: boolean;
  copiedKey: string | null;
  onToggle: () => void;
  onPreview: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key, disabled: selectMode });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg border",
        selectMode && selected
          ? "border-foreground ring-2 ring-foreground/20"
          : "border-border",
      )}
    >
      {isVideo(item.key) ? (
        <video
          src={`/api/media?key=${encodeURIComponent(item.key)}`}
          poster={`/api/media?key=${encodeURIComponent(`${item.key}.poster.jpg`)}`}
          className="aspect-square w-full object-cover"
          muted
          preload="metadata"
        />
      ) : (
        <img
          src={`/api/media?key=${encodeURIComponent(item.key)}`}
          alt={item.key}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      )}
      {isVideo(item.key) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
          <div className="rounded-full bg-black/50 p-2">
            <Play size={20} className="fill-white text-white" />
          </div>
        </div>
      )}
      {selectMode ? (
        <div
          className="absolute inset-0 flex cursor-pointer items-start justify-start bg-black/0 p-2 transition-all hover:bg-black/20"
          onClick={onToggle}
        >
          {selected
            ? <CheckSquare size={20} className="rounded bg-white text-black" />
            : <Square size={20} className="rounded bg-white/80 text-gray-500" />}
        </div>
      ) : (
        <>
          <div
            className="absolute inset-0 flex cursor-zoom-in flex-col justify-between p-2 transition-all sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/50 sm:group-hover:opacity-100"
            onClick={onPreview}
          >
            <div className="flex justify-end gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onCopy(); }}
                className="rounded-md bg-white/90 p-1.5 text-black shadow-sm transition-colors hover:bg-white sm:shadow-none"
                aria-label="URL 복사"
              >
                {copiedKey === item.key ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="rounded-md bg-white/90 p-1.5 text-red-500 shadow-sm transition-colors hover:bg-white sm:shadow-none"
                aria-label="삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="hidden text-xs text-white sm:block sm:opacity-0 sm:group-hover:opacity-100">
              <p className="truncate">{item.key.split("/").pop()}</p>
              <p>{formatSize(item.size)}</p>
            </div>
          </div>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 cursor-grab rounded-md bg-white/90 p-1 text-gray-500 shadow-sm transition-opacity active:cursor-grabbing sm:opacity-0 sm:shadow-none sm:group-hover:opacity-100"
          >
            <GripVertical size={14} />
          </div>
        </>
      )}
    </div>
  );
}
