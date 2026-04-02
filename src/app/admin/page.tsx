"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Trash2, Copy, Check, LogIn, FolderOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AdminMediaPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [folder, setFolder] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedKey]);

  const headers = { "x-admin-password": password };

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams({ list: "1" });
    if (folder) params.set("folder", folder);

    const res = await fetch(`/api/media?${params}`, { headers: { "x-admin-password": password } });
    if (!res.ok) return;
    const data = (await res.json()) as { items: MediaItem[] };
    setItems(data.items);
  }, [folder, password]);

  useEffect(() => {
    if (authenticated) fetchItems();
  }, [authenticated, fetchItems]);

  const handleLogin = async () => {
    const res = await fetch("/api/media?list=1", { headers: { "x-admin-password": password } });
    if (res.ok) {
      setAuthenticated(true);
      setAuthError("");
      const data = (await res.json()) as { items: MediaItem[] };
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
    if (folder) formData.append("folder", folder);

    await fetch("/api/media", {
      method: "POST",
      headers: { "x-admin-password": password },
      body: formData,
    });

    setUploading(false);
    fetchItems();
  };

  const handleDelete = async (key: string) => {
    await fetch("/api/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ key }),
    });
    fetchItems();
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
      <h1 className="mb-6 text-2xl font-bold">미디어 관리</h1>

      {/* 폴더 선택 */}
      <div className="mb-4 flex items-center gap-2">
        <FolderOpen size={16} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="폴더 (예: sapporo)"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-hidden focus:border-foreground/30"
        />
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
        <p className="text-xs text-muted-foreground">여러 파일을 한 번에 업로드할 수 있어요</p>
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

      {/* 갤러리 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative overflow-hidden rounded-lg border border-border"
            >
              <img
                src={`/api/media?key=${encodeURIComponent(item.key)}`}
                alt={item.key}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 flex cursor-zoom-in flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100"
                onClick={() => setSelectedKey(item.key)}
              >
                <div className="flex justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopy(item.key); }}
                    className="rounded-md bg-white/90 p-1.5 text-black transition-colors hover:bg-white"
                    aria-label="MDX 태그 복사"
                  >
                    {copiedKey === item.key ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.key); }}
                    className="rounded-md bg-white/90 p-1.5 text-red-500 transition-colors hover:bg-white"
                    aria-label="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-xs text-white">
                  <p className="truncate">{item.key.split("/").pop()}</p>
                  <p>{formatSize(item.size)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          업로드된 미디어가 없어요
        </p>
      )}

      {/* 라이트박스 */}
      <AnimatePresence>
        {selectedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedKey(null)}
          >
            <button
              onClick={() => setSelectedKey(null)}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={`/api/media?key=${encodeURIComponent(selectedKey)}`}
              alt={selectedKey}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
