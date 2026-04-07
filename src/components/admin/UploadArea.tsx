"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadArea({
  currentPath,
  onUpload,
}: {
  currentPath: string;
  onUpload: (files: FileList | File[]) => Promise<void>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    const arr = Array.from(files);
    setUploading(true);
    setUploadCount(arr.length);
    setHasVideo(arr.some((f) => f.type.startsWith("video/")));
    try {
      await onUpload(files);
    } finally {
      setUploading(false);
      setUploadCount(0);
      setHasVideo(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (uploading) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (uploading) return;
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
      onClick={() => {
        if (uploading) return;
        fileInputRef.current?.click();
      }}
      className={cn(
        "relative mb-8 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-8 transition-colors",
        uploading
          ? "cursor-wait border-foreground/40 bg-accent/60"
          : dragOver
            ? "cursor-pointer border-foreground/40 bg-accent"
            : "cursor-pointer border-border hover:border-foreground/20 hover:bg-accent/50",
      )}
    >
      {uploading ? (
        <Loader2 size={24} className="animate-spin text-foreground/70" />
      ) : (
        <Upload size={24} className="text-muted-foreground" />
      )}

      <p className={cn("text-sm", uploading ? "font-medium text-foreground" : "text-muted-foreground")}>
        {uploading
          ? `${uploadCount}개 파일 업로드 중...`
          : "클릭하거나 파일을 드래그해서 업로드"}
      </p>
      <p className="text-xs text-muted-foreground">
        {uploading
          ? hasVideo
            ? "포스터 생성과 R2 업로드를 진행 중이에요"
            : "R2에 업로드 중이에요"
          : currentPath
            ? `${currentPath}/에 업로드`
            : "루트에 업로드"}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.gif,.webp"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
