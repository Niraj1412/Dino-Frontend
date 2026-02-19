"use client";

import { motion } from "framer-motion";

import { useThemeStore } from "@/store/theme-store";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200/20 bg-slate-900/35 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.09em] text-slate-100 backdrop-blur-xl transition hover:bg-slate-800/55"
    >
      <span aria-hidden className="text-[0.65rem] tracking-[0.08em]">
        {theme === "dark" ? "DM" : "LM"}
      </span>
      <motion.span
        key={theme}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {theme === "dark" ? "Dark" : "Light"}
      </motion.span>
    </button>
  );
}
