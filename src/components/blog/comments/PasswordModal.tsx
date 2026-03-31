"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PasswordModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: "edit" | "delete";
  onConfirm: (password: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");
    const ok = await onConfirm(password);
    if (!ok) {
      setError("비밀번호가 일치하지 않아요");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
      >
        <p className="mb-4 text-sm font-medium">
          {action === "delete" ? "삭제" : "수정"}하려면 비밀번호를 입력하세요
        </p>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
          }}
          autoFocus
          className={cn(
            "mb-1 w-full rounded-lg border bg-background px-4 py-2 text-base outline-hidden focus:border-foreground/30",
            error ? "border-destructive" : "border-border",
          )}
        />
        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
        {!error && <div className="mb-3" />}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password.trim() || loading}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {loading ? "확인 중..." : "확인"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
