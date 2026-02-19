import { create } from "zustand";

import { clamp } from "@/lib/time";

export type PlayerMode = "hidden" | "full" | "mini";
export type PipState = "idle" | "active" | "unsupported" | "error";

type OpenVideoOptions = {
  autoplay?: boolean;
  mode?: Exclude<PlayerMode, "hidden">;
  sourceCardId?: string;
};

export type SkipFeedback = {
  token: number;
  delta: number;
} | null;

type PlayerState = {
  currentVideoId: string | null;
  mode: PlayerMode;
  isPlaying: boolean;
  isVideoLoading: boolean;
  videoError: string | null;
  currentTime: number;
  duration: number;
  sourceCardId: string | null;
  skipFeedback: SkipFeedback;
  pipState: PipState;
  openVideo: (videoId: string, options?: OpenVideoOptions) => void;
  switchVideo: (videoId: string) => void;
  setMode: (mode: PlayerMode) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVideoReady: () => void;
  setVideoError: (errorMessage: string) => void;
  clearVideoError: () => void;
  showSkipFeedback: (delta: number) => void;
  clearSkipFeedback: () => void;
  setPipState: (pipState: PipState) => void;
  closePlayer: () => void;
};

export const usePlayerStore = create<PlayerState>()((set) => ({
  currentVideoId: null,
  mode: "hidden",
  isPlaying: false,
  isVideoLoading: false,
  videoError: null,
  currentTime: 0,
  duration: 0,
  sourceCardId: null,
  skipFeedback: null,
  pipState: "idle",
  openVideo: (videoId, options) =>
    set((state) => {
      const sameVideo = state.currentVideoId === videoId;

      return {
        currentVideoId: videoId,
        mode: options?.mode ?? "full",
        isPlaying: options?.autoplay ?? true,
        isVideoLoading: true,
        videoError: null,
        currentTime: sameVideo ? state.currentTime : 0,
        duration: sameVideo ? state.duration : 0,
        sourceCardId: options?.sourceCardId ?? videoId,
        skipFeedback: null,
        pipState: "idle" as const,
      };
    }),
  switchVideo: (videoId) =>
    set((state) => ({
      currentVideoId: videoId,
      isPlaying: true,
      isVideoLoading: true,
      videoError: null,
      currentTime: 0,
      duration: 0,
      sourceCardId: videoId,
      mode: state.mode === "hidden" ? "full" : state.mode,
      skipFeedback: null,
      pipState: "idle" as const,
    })),
  setMode: (mode) => set(() => ({ mode })),
  setPlaying: (isPlaying) => set(() => ({ isPlaying })),
  setCurrentTime: (seconds) =>
    set((state) => {
      const maxValue = state.duration > 0 ? state.duration : Number.POSITIVE_INFINITY;
      return {
        currentTime: clamp(seconds, 0, maxValue),
      };
    }),
  setDuration: (duration) =>
    set((state) => {
      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

      return {
        duration: safeDuration,
        currentTime:
          safeDuration > 0 ? clamp(state.currentTime, 0, safeDuration) : state.currentTime,
      };
    }),
  setVideoReady: () => set(() => ({ isVideoLoading: false })),
  setVideoError: (videoError) =>
    set(() => ({
      videoError,
      isVideoLoading: false,
      isPlaying: false,
    })),
  clearVideoError: () => set(() => ({ videoError: null })),
  showSkipFeedback: (delta) =>
    set(() => ({
      skipFeedback: {
        token: Date.now() + Math.random(),
        delta,
      },
    })),
  clearSkipFeedback: () => set(() => ({ skipFeedback: null })),
  setPipState: (pipState) => set(() => ({ pipState })),
  closePlayer: () =>
    set(() => ({
      currentVideoId: null,
      mode: "hidden",
      isPlaying: false,
      isVideoLoading: false,
      videoError: null,
      currentTime: 0,
      duration: 0,
      sourceCardId: null,
      skipFeedback: null,
      pipState: "idle",
    })),
}));
