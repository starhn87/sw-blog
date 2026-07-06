"use client";

import { CheckSquare, Square, FolderOpen, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderItem({
  folder,
  selectMode,
  selected,
  renaming,
  renameValue,
  renamingBusy,
  onToggle,
  onOpen,
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDelete,
}: {
  folder: string;
  selectMode: boolean;
  selected: boolean;
  renaming: boolean;
  renameValue: string;
  renamingBusy: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRenameStart: () => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}) {
  const name = folder.split("/").pop();
  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg border pr-1 text-sm transition-colors",
        selectMode && selected
          ? "border-foreground bg-accent"
          : "border-border hover:bg-accent",
      )}
    >
      {selectMode ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2"
        >
          {selected
            ? <CheckSquare size={16} className="text-foreground" />
            : <Square size={16} className="text-muted-foreground" />}
          <FolderOpen size={16} className="text-muted-foreground" />
          {name}
        </button>
      ) : renaming ? (
        <span className="flex items-center gap-2 px-3 py-2">
          {renamingBusy ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <FolderOpen size={16} className="text-muted-foreground" />
          )}
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit();
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={onRenameSubmit}
            autoFocus
            disabled={renamingBusy}
            className="w-28 rounded border border-border bg-background px-2 py-0.5 text-sm outline-hidden disabled:opacity-50"
          />
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-2 px-3 py-2"
          >
            <FolderOpen size={16} className="text-muted-foreground" />
            {name}
          </button>
          <button
            type="button"
            onClick={onRenameStart}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="폴더 이름 변경"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="폴더 삭제"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
