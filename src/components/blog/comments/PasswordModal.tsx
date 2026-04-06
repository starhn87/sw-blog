"use client";

import { useState, useEffect, useRef } from "react";
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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          "input, button:not([disabled])",
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleConfirm = async () => {
    if (!password.trim()) return;
    setError("");
    const ok = await onConfirm(password);
    if (!ok) {
      setError("비밀번호가 일치하지 않아요");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${action === "delete" ? "삭제" : "수정"} 비밀번호 확인`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl"
      >
        <label>
          <span className="mb-4 block text-sm font-medium">
            {action === "delete" ? "삭제" : "수정"}하려면 비밀번호를 입력하세요
          </span>
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
              "mb-1 w-full rounded-lg border bg-background px-4 py-2 text-base outline-hidden",
              error ? "border-destructive" : "border-border",
            )}
          />
        </label>
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
            disabled={!password.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-sm text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            확인
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
