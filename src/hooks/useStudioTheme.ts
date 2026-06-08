"use client";

import { useCallback, useState } from "react";

export type StudioTheme = "light" | "dark";

const STORAGE_KEY = "studio-pro-theme";

function readStoredTheme(): StudioTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function useStudioTheme() {
  const [theme, setThemeState] = useState<StudioTheme>(() => readStoredTheme());

  const setTheme = useCallback((next: StudioTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: StudioTheme = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
