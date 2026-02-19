"use client";

import { LayoutGroup } from "framer-motion";

import { PerfOverlay } from "@/components/dev/perf-overlay";
import { PlayerLayer } from "@/components/player/player-layer";
import { ThemeController } from "@/components/theme/theme-controller";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <LayoutGroup id="dino-player-layout">
      <ThemeController />
      <PerfOverlay />
      {children}
      <PlayerLayer />
    </LayoutGroup>
  );
}
