"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

export function DisplayModeButton() {
  // theme: "light" | "dark"
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (
        (window.localStorage.getItem("theme") as "light" | "dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      );
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="border border-border bg-background rounded-lg w-10 h-10 flex items-center justify-center relative cursor-pointer transition-colors duration-200"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
