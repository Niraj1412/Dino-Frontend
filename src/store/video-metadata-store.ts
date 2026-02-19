import { create } from "zustand";

import type { YouTubeMetadataItem } from "@/lib/youtube";

const CACHE_STORAGE_KEY = "dino-stream-metadata-v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

type VideoMetadataStoreState = {
  durationByYoutubeId: Record<string, number>;
  titleByYoutubeId: Record<string, string>;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  hydrate: (youtubeIds: string[]) => Promise<void>;
  upsertDuration: (youtubeId: string, durationSeconds: number) => void;
};

type PersistedMetadataState = {
  savedAt: number;
  durationByYoutubeId: Record<string, number>;
  titleByYoutubeId: Record<string, string>;
};

function readCache(): PersistedMetadataState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedMetadataState;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCache(state: PersistedMetadataState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence failures
  }
}

function applyItems(
  items: YouTubeMetadataItem[],
  durationByYoutubeId: Record<string, number>,
  titleByYoutubeId: Record<string, string>,
) {
  const nextDurations = { ...durationByYoutubeId };
  const nextTitles = { ...titleByYoutubeId };

  for (const item of items) {
    if (item.durationSeconds > 0) {
      nextDurations[item.youtubeId] = item.durationSeconds;
    }

    if (item.title) {
      nextTitles[item.youtubeId] = item.title;
    }
  }

  return {
    durationByYoutubeId: nextDurations,
    titleByYoutubeId: nextTitles,
  };
}

export const useVideoMetadataStore = create<VideoMetadataStoreState>()(
  (set, get) => ({
    durationByYoutubeId: {},
    titleByYoutubeId: {},
    status: "idle",
    error: null,
    hydrate: async (youtubeIds) => {
      const uniqueIds = Array.from(new Set(youtubeIds));
      if (uniqueIds.length === 0) {
        return;
      }

      const state = get();
      if (state.status === "loading") {
        return;
      }

      const cache = readCache();
      if (cache) {
        set(() => ({
          durationByYoutubeId: cache.durationByYoutubeId,
          titleByYoutubeId: cache.titleByYoutubeId,
          status: "ready",
          error: null,
        }));
      }

      set(() => ({ status: "loading", error: null }));

      try {
        const response = await fetch(
          `/api/youtube-metadata?ids=${encodeURIComponent(uniqueIds.join(","))}`,
        );
        const payload = (await response.json()) as {
          items?: YouTubeMetadataItem[];
          reason?: string;
        };

        const items = payload.items ?? [];
        const merged = applyItems(
          items,
          get().durationByYoutubeId,
          get().titleByYoutubeId,
        );

        set(() => ({
          ...merged,
          status: "ready",
          error: null,
        }));

        writeCache({
          ...merged,
          savedAt: Date.now(),
        });
      } catch {
        set(() => ({
          status: "error",
          error: "metadata_request_failed",
        }));
      }
    },
    upsertDuration: (youtubeId, durationSeconds) =>
      set((state) => {
        if (!youtubeId || durationSeconds <= 0) {
          return state;
        }

        const currentDuration = state.durationByYoutubeId[youtubeId] ?? 0;
        if (currentDuration >= durationSeconds) {
          return state;
        }

        const nextDurations = {
          ...state.durationByYoutubeId,
          [youtubeId]: durationSeconds,
        };

        writeCache({
          savedAt: Date.now(),
          durationByYoutubeId: nextDurations,
          titleByYoutubeId: state.titleByYoutubeId,
        });

        return {
          ...state,
          durationByYoutubeId: nextDurations,
        };
      }),
  }),
);
