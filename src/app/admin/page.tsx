"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Trash2, Copy, Check, LogIn, FolderOpen, FolderPlus, ChevronLeft, ChevronRight, X, CheckSquare, Square, GripVertical, Play } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { PasswordModal } from "@/components/blog/comments/PasswordModal";

interface MediaItem {
  key: string;
  size: number;
  uploaded: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isVideo(key: string) {
  return /\.(mp4|mov|webm|ogg|avi)$/i.test(key);
}

function SortableMediaItem({
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
          {/* 호버 오버레이 */}
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
          {/* 드래그 핸들 — 오버레이 위에 배치 */}
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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 선택 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  const selectedCount = selectedFiles.size + selectedFolders.size;

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  };

  const toggleFile = (key: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFolder = (folder: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCount === items.length + folders.length) {
      setSelectedFiles(new Set());
      setSelectedFolders(new Set());
    } else {
      setSelectedFiles(new Set(items.map((i) => i.key)));
      setSelectedFolders(new Set(folders));
    }
  };

  const navigateLightbox = useCallback((dir: -1 | 1) => {
    if (!selectedKey) return;
    const idx = items.findIndex((i) => i.key === selectedKey);
    if (idx === -1) return;
    const next = idx + dir;
    if (next >= 0 && next < items.length) setSelectedKey(items[next].key);
  }, [selectedKey, items]);

  useEffect(() => {
    if (!selectedKey) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedKey(null);
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKey, navigateLightbox]);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams({ list: "1" });
    if (currentPath) params.set("folder", currentPath);

    const res = await fetch(`/api/media?${params}`, { headers: { "x-admin-password": password } });
    if (!res.ok) return;
    const data = (await res.json()) as { folders: string[]; items: MediaItem[] };
    setFolders(data.folders ?? []);
    setItems(data.items);
  }, [currentPath, password]);

  useEffect(() => {
    if (authenticated) fetchItems();
  }, [authenticated, fetchItems]);

  // 경로 변경 시 선택 초기화
  useEffect(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, [currentPath]);

  const handleLogin = async () => {
    const res = await fetch("/api/media?list=1", { headers: { "x-admin-password": password } });
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
      const data = (await res.json()) as { folders: string[]; items: MediaItem[] };
      setFolders(data.folders ?? []);
      setItems(data.items);
    } else {
      setAuthError("비밀번호가 일치하지 않아요");
    }
  };

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }
    if (currentPath) formData.append("folder", currentPath);

    await fetch("/api/media", {
      method: "POST",
      headers: { "x-admin-password": password },
      body: formData,
    });

    setUploading(false);
    fetchItems();
  };

  const handleDeleteConfirm = async (inputPassword: string): Promise<boolean> => {
    const body: { keys?: string[]; folders?: string[] } = {};
    if (selectedFiles.size > 0) body.keys = [...selectedFiles];
    if (selectedFolders.size > 0) body.folders = [...selectedFolders];
    if (!body.keys && !body.folders) return false;

    const res = await fetch("/api/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": inputPassword },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    setShowDeleteModal(false);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
    setSelectMode(false);
    fetchItems();
    return true;
  };

  const handleSingleDelete = (type: "file" | "folder", target: string) => {
    if (type === "file") {
      setSelectedFiles(new Set([target]));
      setSelectedFolders(new Set());
    } else {
      setSelectedFolders(new Set([target]));
      setSelectedFiles(new Set());
    }
    setShowDeleteModal(true);
  };

  const handleCopy = (key: string) => {
    const url = `${window.location.origin}/api/media?key=${encodeURIComponent(key)}`;
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const handleCreateFolder = () => {
    if (!newFolder.trim()) return;
    const target = currentPath ? `${currentPath}/${newFolder.trim()}` : newFolder.trim();
    setCurrentPath(target);
    setNewFolder("");
    setShowNewFolder(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.key === active.id);
    const newIndex = items.findIndex((i) => i.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setItems(reordered);

    await fetch("/api/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        folder: currentPath || undefined,
        order: reordered.map((i) => i.key),
      }),
    });
  };

  const pathSegments = currentPath ? currentPath.split("/") : [];

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <input
          type="password"
          placeholder="관리자 비밀번호"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setAuthError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          autoFocus
          className={cn(
            "w-full rounded-lg border bg-background px-4 py-2 text-base outline-hidden focus:border-foreground/30",
            authError ? "border-destructive" : "border-border",
          )}
        />
        {authError && <p className="text-xs text-destructive">{authError}</p>}
        <button
          onClick={handleLogin}
          disabled={!password.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          <LogIn size={16} />
          로그인
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">미디어 관리</h1>
        <button
          onClick={toggleSelectMode}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            selectMode
              ? "bg-foreground text-background"
              : "border border-border hover:bg-accent",
          )}
        >
          {selectMode ? "선택 취소" : "선택"}
        </button>
      </div>

      {/* 선택 모드 액션 바 */}
      {selectMode && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-accent/50 px-4 py-2 text-sm">
          <button onClick={selectAll} className="text-muted-foreground transition-colors hover:text-foreground">
            {selectedCount === items.length + folders.length ? "전체 해제" : "전체 선택"}
          </button>
          <span className="text-muted-foreground">
            {selectedCount}개 선택됨
          </span>
          {selectedCount > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-red-500 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              삭제
            </button>
          )}
        </div>
      )}

      {/* 경로 탐색 (breadcrumb) */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentPath("")}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors hover:bg-accent",
            !currentPath && "font-semibold",
          )}
        >
          /
        </button>
        {pathSegments.map((seg, i) => {
          const path = pathSegments.slice(0, i + 1).join("/");
          const isLast = i === pathSegments.length - 1;
          return (
            <span key={path} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-muted-foreground" />
              <button
                onClick={() => setCurrentPath(path)}
                className={cn(
                  "rounded px-1.5 py-0.5 transition-colors hover:bg-accent",
                  isLast && "font-semibold",
                )}
              >
                {seg}
              </button>
            </span>
          );
        })}
        <span className="ml-2">
          {showNewFolder ? (
            <span className="flex items-center gap-1">
              <ChevronRight size={14} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="폴더 이름"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") { setShowNewFolder(false); setNewFolder(""); }
                }}
                onBlur={() => { setShowNewFolder(false); setNewFolder(""); }}
                autoFocus
                className="w-32 rounded border border-border bg-background px-2 py-0.5 text-sm outline-hidden focus:border-foreground/30"
              />
            </span>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="새 폴더"
            >
              <FolderPlus size={16} />
            </button>
          )}
        </span>
      </div>

      {/* 업로드 영역 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "mb-8 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors",
          dragOver
            ? "border-foreground/40 bg-accent"
            : "border-border hover:border-foreground/20 hover:bg-accent/50",
        )}
      >
        <Upload size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading
            ? "업로드 중..."
            : "클릭하거나 파일을 드래그해서 업로드"}
        </p>
        <p className="text-xs text-muted-foreground">
          {currentPath ? `${currentPath}/에 업로드` : "루트에 업로드"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.gif,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* 폴더 목록 */}
      {folders.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {folders.map((f) => (
            <div
              key={f}
              className={cn(
                "group flex items-center gap-1 rounded-lg border pr-1 text-sm transition-colors",
                selectMode && selectedFolders.has(f)
                  ? "border-foreground bg-accent"
                  : "border-border hover:bg-accent",
              )}
            >
              {selectMode ? (
                <button
                  onClick={() => toggleFolder(f)}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  {selectedFolders.has(f)
                    ? <CheckSquare size={16} className="text-foreground" />
                    : <Square size={16} className="text-muted-foreground" />}
                  <FolderOpen size={16} className="text-muted-foreground" />
                  {f.split("/").pop()}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentPath(f)}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <FolderOpen size={16} className="text-muted-foreground" />
                    {f.split("/").pop()}
                  </button>
                  <button
                    onClick={() => handleSingleDelete("folder", f)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="폴더 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 갤러리 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.key)} strategy={rectSortingStrategy}>
          <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 ${selectedKey ? "invisible" : ""}`}>
            {items.map((item) => (
              <SortableMediaItem
                key={item.key}
                item={item}
                selectMode={selectMode}
                selected={selectedFiles.has(item.key)}
                copiedKey={copiedKey}
                onToggle={() => toggleFile(item.key)}
                onPreview={() => setSelectedKey(item.key)}
                onCopy={() => handleCopy(item.key)}
                onDelete={() => handleSingleDelete("file", item.key)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {folders.length === 0 && items.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          비어있는 경로예요
        </p>
      )}

      {/* 라이트박스 */}
      <AnimatePresence>
        {selectedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedKey(null)}
          >
            <button
              onClick={() => setSelectedKey(null)}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <div
              className="relative flex items-center justify-center sm:gap-6"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                (e.currentTarget as HTMLElement).dataset.touchX = String(touch.clientX);
              }}
              onTouchEnd={(e) => {
                const startX = Number((e.currentTarget as HTMLElement).dataset.touchX);
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                if (Math.abs(diff) > 50) {
                  if (diff > 0) navigateLightbox(1);
                  else navigateLightbox(-1);
                }
              }}
            >
              {/* 데스크탑 좌우 버튼 */}
              {items.findIndex((i) => i.key === selectedKey) > 0 ? (
                <button
                  onClick={() => navigateLightbox(-1)}
                  className="hidden shrink-0 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/40 sm:block"
                  aria-label="이전"
                >
                  <ChevronLeft size={28} />
                </button>
              ) : (
                <div className="hidden w-[52px] shrink-0 sm:block" />
              )}
              {isVideo(selectedKey) ? (
                <motion.video
                  key={selectedKey}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                  controls
                  autoPlay
                  className="max-h-[85vh] max-w-[90vw] rounded-lg sm:max-w-[85vw]"
                />
              ) : (
                <motion.img
                  key={selectedKey}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
                  alt={selectedKey}
                  className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain sm:max-w-[85vw]"
                />
              )}
              {items.findIndex((i) => i.key === selectedKey) < items.length - 1 ? (
                <button
                  onClick={() => navigateLightbox(1)}
                  className="hidden shrink-0 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/40 sm:block"
                  aria-label="다음"
                >
                  <ChevronRight size={28} />
                </button>
              ) : (
                <div className="hidden w-[52px] shrink-0 sm:block" />
              )}
              {/* 모바일 오버레이 버튼 */}
              {items.findIndex((i) => i.key === selectedKey) > 0 && (
                <button
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-2 rounded-full bg-black/40 p-1.5 text-white sm:hidden"
                  aria-label="이전"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {items.findIndex((i) => i.key === selectedKey) < items.length - 1 && (
                <button
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-2 rounded-full bg-black/40 p-1.5 text-white sm:hidden"
                  aria-label="다음"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 삭제 비밀번호 모달 */}
      <AnimatePresence>
        {showDeleteModal && (
          <PasswordModal
            action="delete"
            onConfirm={handleDeleteConfirm}
            onCancel={() => {
              setShowDeleteModal(false);
              if (!selectMode) {
                setSelectedFiles(new Set());
                setSelectedFolders(new Set());
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
