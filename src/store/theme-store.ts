import { create } from "zustand";

const STORAGE_KEY = "dino-stream-theme";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  theme: ThemeMode;
  hydrated: boolean;
  initializeTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

function resolveSystemTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: "dark",
  hydrated: false,
  initializeTheme: () => {
    if (typeof window === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : resolveSystemTheme();

    applyTheme(nextTheme);
    set(() => ({
      theme: nextTheme,
      hydrated: true,
    }));
  },
  setTheme: (theme) => {
    applyTheme(theme);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }

    set(() => ({ theme }));
  },
  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },
}));
