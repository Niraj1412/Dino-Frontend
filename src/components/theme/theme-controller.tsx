"use client";

import { useEffect } from "react";

import { useThemeStore } from "@/store/theme-store";

export function ThemeController() {
  const hydrated = useThemeStore((state) => state.hydrated);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    if (!hydrated) {
      initializeTheme();
    }
  }, [hydrated, initializeTheme]);

  return null;
}
