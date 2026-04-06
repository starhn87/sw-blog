"use client";

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Trash2, FolderOpen, FolderPlus, ChevronRight, CheckSquare, Square, Pencil } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { PasswordModal } from "@/components/blog/comments/PasswordModal";
import { AdminAuth } from "@/components/admin/AdminAuth";
import { SortableMediaItem } from "@/components/admin/SortableMediaItem";
import { MediaLightbox } from "@/components/admin/MediaLightbox";
import { UploadArea } from "@/components/admin/UploadArea";
import type { MediaItem } from "@/components/admin/types";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [currentPath, setCurrentPath] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  useEffect(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, [currentPath]);

  const handleUpload = async (files: FileList | File[]) => {
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

  const handleRenameFolder = async (oldPath: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldPath.split("/").pop()) {
      setRenamingFolder(null);
      return;
    }
    const parentPath = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/")) : "";
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    await fetch("/api/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ renameFolder: { from: oldPath, to: newPath } }),
    });
    setRenamingFolder(null);
    fetchItems();
  };

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
      <AdminAuth
        onLogin={(pw, data) => {
          setPassword(pw);
          setAuthenticated(true);
          setFolders(data.folders ?? []);
          setItems(data.items);
        }}
      />
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

      {/* 경로 탐색 */}
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
                className="w-32 rounded border border-border bg-background px-2 py-0.5 text-sm outline-hidden"
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

      <UploadArea currentPath={currentPath} onUpload={handleUpload} />

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
              ) : renamingFolder === f ? (
                <span className="flex items-center gap-2 px-3 py-2">
                  <FolderOpen size={16} className="text-muted-foreground" />
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameFolder(f);
                      if (e.key === "Escape") setRenamingFolder(null);
                    }}
                    onBlur={() => handleRenameFolder(f)}
                    autoFocus
                    className="w-28 rounded border border-border bg-background px-2 py-0.5 text-sm outline-hidden"
                  />
                </span>
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
                    onClick={() => {
                      setRenamingFolder(f);
                      setRenameValue(f.split("/").pop() ?? "");
                    }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="폴더 이름 변경"
                  >
                    <Pencil size={14} />
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

      <MediaLightbox
        items={items}
        selectedKey={selectedKey}
        onClose={() => setSelectedKey(null)}
        onNavigate={setSelectedKey}
      />

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
