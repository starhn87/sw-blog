"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "./types";

export function AdminAuth({
  onLogin,
}: {
  onLogin: (password: string, data: { folders: string[]; items: MediaItem[] }) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const res = await fetch("/api/media?list=1", { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data = (await res.json()) as { folders: string[]; items: MediaItem[] };
      localStorage.setItem("is-admin", "true");
      onLogin(password, data);
    } else {
      setError("비밀번호가 일치하지 않아요");
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <input
        type="password"
        placeholder="관리자 비밀번호"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleLogin();
        }}
        autoFocus
        className={cn(
          "w-full rounded-lg border bg-background px-4 py-2 text-base outline-hidden",
          error ? "border-destructive" : "border-border",
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="button"
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
