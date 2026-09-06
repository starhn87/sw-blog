"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { listMedia, MediaApiError, type MediaList } from "./mediaClient";

export function AdminAuth({
  onLogin,
}: {
  onLogin: (password: string, data: MediaList) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const data = await listMedia(password);
      localStorage.setItem("is-admin", "true");
      onLogin(password, data);
    } catch (requestError) {
      setError(
        requestError instanceof MediaApiError && requestError.status === 401
          ? "비밀번호가 일치하지 않아요"
          : "로그인을 확인하지 못했어요. 다시 시도해 주세요.",
      );
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
          if (e.key === "Enter") void handleLogin();
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
