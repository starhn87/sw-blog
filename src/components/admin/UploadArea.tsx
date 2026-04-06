"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    await onUpload(files);
    setUploading(false);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
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
  );
}
