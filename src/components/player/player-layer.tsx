"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player";

import { RelatedSheet } from "@/components/player/related-sheet";
import { RelatedSidebar } from "@/components/player/related-sidebar";
import { VideoErrorBoundary } from "@/components/player/video-error-boundary";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  getNextVideo,
  getRelatedVideos,
  getThumbnailUrl,
  getVideoById,
  getVideoUrl,
} from "@/data/videos";
import { cn } from "@/lib/cn";
import { clamp, formatTime } from "@/lib/time";
import { usePlayerStore } from "@/store/player-store";
import { useVideoMetadataStore } from "@/store/video-metadata-store";

type DragSession = {
  active: boolean;
  pointerId: number | null;
  pointerType: string;
  startY: number;
  startTs: number;
  lastY: number;
  lastTs: number;
  velocity: number;
  nextOffset: number;
  isTapCandidate: boolean;
  dragActivated: boolean;
  rafId: number;
};

type NextCountdownState = {
  sourceId: string;
  targetId: string;
  remainingMs: number;
} | null;

const MINIMIZE_DISTANCE = 140;
const MINIMIZE_VELOCITY = 1.45;
const DRAG_ACTIVATION_DISTANCE = 12;
const TAP_MAX_DISTANCE = 9;
const TAP_MAX_DURATION = 280;

export function PlayerLayer() {
  const router = useRouter();
  const pathname = usePathname();

  const playerRef = useRef<ReactPlayer | null>(null);
  const timeSyncRef = useRef<{ rafId: number; nextTime: number }>({
    rafId: 0,
    nextTime: 0,
  });
  const dragSessionRef = useRef<DragSession>({
    active: false,
    pointerId: null,
    pointerType: "",
    startY: 0,
    startTs: 0,
    lastY: 0,
    lastTs: 0,
    velocity: 0,
    nextOffset: 0,
    isTapCandidate: false,
    dragActivated: false,
    rafId: 0,
  });

  const [relatedOpen, setRelatedOpen] = useState(false);
  const [nextCountdown, setNextCountdown] = useState<NextCountdownState>(null);
  const [pipNotice, setPipNotice] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragY = useMotionValue(0);
  const dragScale = useTransform(dragY, [0, 240], [1, 0.86]);
  const dragOpacity = useTransform(dragY, [0, 240], [1, 0.89]);

  const closePlayer = usePlayerStore((state) => state.closePlayer);
  const clearSkipFeedback = usePlayerStore((state) => state.clearSkipFeedback);
  const clearVideoError = usePlayerStore((state) => state.clearVideoError);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const currentVideoId = usePlayerStore((state) => state.currentVideoId);
  const duration = usePlayerStore((state) => state.duration);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isVideoLoading = usePlayerStore((state) => state.isVideoLoading);
  const mode = usePlayerStore((state) => state.mode);
  const openVideo = usePlayerStore((state) => state.openVideo);
  const pipState = usePlayerStore((state) => state.pipState);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setMode = usePlayerStore((state) => state.setMode);
  const setPipState = usePlayerStore((state) => state.setPipState);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setVideoError = usePlayerStore((state) => state.setVideoError);
  const setVideoReady = usePlayerStore((state) => state.setVideoReady);
  const showSkipFeedback = usePlayerStore((state) => state.showSkipFeedback);
  const skipFeedback = usePlayerStore((state) => state.skipFeedback);
  const switchVideo = usePlayerStore((state) => state.switchVideo);
  const videoError = usePlayerStore((state) => state.videoError);
  const durationByYoutubeId = useVideoMetadataStore(
    (state) => state.durationByYoutubeId,
  );
  const upsertDuration = useVideoMetadataStore((state) => state.upsertDuration);

  const currentVideo = useMemo(() => getVideoById(currentVideoId), [currentVideoId]);
  const relatedVideos = useMemo(
    () => (currentVideo ? getRelatedVideos(currentVideo.id, 48) : []),
    [currentVideo],
  );
  const nextVideo = useMemo(
    () => (currentVideo ? getNextVideo(currentVideo.id) : null),
    [currentVideo],
  );

  const resetDragToOrigin = useCallback(() => {
    animate(dragY, 0, {
      type: "spring",
      stiffness: 340,
      damping: 30,
      mass: 0.7,
    });
  }, [dragY]);

  const flushDragFrame = useCallback(() => {
    const dragSession = dragSessionRef.current;

    if (dragSession.rafId) {
      return;
    }

    dragSession.rafId = window.requestAnimationFrame(() => {
      dragY.set(dragSession.nextOffset);
      dragSession.rafId = 0;
    });
  }, [dragY]);

  const resetGestureSession = useCallback(() => {
    const dragSession = dragSessionRef.current;
    dragSession.active = false;
    dragSession.pointerId = null;
    dragSession.pointerType = "";
    dragSession.startY = 0;
    dragSession.startTs = 0;
    dragSession.lastY = 0;
    dragSession.lastTs = 0;
    dragSession.velocity = 0;
    dragSession.nextOffset = 0;
    dragSession.isTapCandidate = false;
    dragSession.dragActivated = false;

    if (dragSession.rafId) {
      window.cancelAnimationFrame(dragSession.rafId);
      dragSession.rafId = 0;
    }
  }, []);

  const minimize = useCallback(() => {
    setMode("mini");
    setRelatedOpen(false);
    setIsDragging(false);
    dragY.set(0);
    resetGestureSession();

    if (pathname !== "/") {
      router.push("/");
    }
  }, [dragY, pathname, resetGestureSession, router, setMode]);

  const finalizeDrag = useCallback(
    (element: HTMLDivElement, pointerId: number) => {
      const dragSession = dragSessionRef.current;

      if (!dragSession.active || dragSession.pointerId !== pointerId) {
        return;
      }

      if (element.hasPointerCapture(pointerId)) {
        try {
          element.releasePointerCapture(pointerId);
        } catch {
          // Ignore capture release errors from synthetic test events.
        }
      }

      const pressDuration = performance.now() - dragSession.startTs;
      const isTapGesture =
        dragSession.isTapCandidate &&
        !dragSession.dragActivated &&
        pressDuration <= TAP_MAX_DURATION;

      if (isTapGesture) {
        setPlaying(!isPlaying);
        setRelatedOpen(false);
        setIsDragging(false);
        resetGestureSession();
        return;
      }

      const shouldMinimize =
        dragSession.nextOffset > MINIMIZE_DISTANCE ||
        dragSession.velocity > MINIMIZE_VELOCITY;

      setIsDragging(false);

      if (shouldMinimize) {
        minimize();
        return;
      }

      resetDragToOrigin();
      resetGestureSession();
    },
    [isPlaying, minimize, resetDragToOrigin, resetGestureSession, setPlaying],
  );

  const onSurfacePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (mode !== "full") {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const dragSession = dragSessionRef.current;
      dragSession.active = true;
      dragSession.pointerId = event.pointerId;
      dragSession.pointerType = event.pointerType;
      dragSession.startY = event.clientY;
      dragSession.startTs = performance.now();
      dragSession.lastY = event.clientY;
      dragSession.lastTs = dragSession.startTs;
      dragSession.velocity = 0;
      dragSession.nextOffset = 0;
      dragSession.isTapCandidate = true;
      dragSession.dragActivated = false;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors from synthetic test events.
      }
      setRelatedOpen(false);
    },
    [mode],
  );

  const onSurfacePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragSession = dragSessionRef.current;

      if (!dragSession.active || dragSession.pointerId !== event.pointerId) {
        return;
      }

      const totalDistance = Math.abs(event.clientY - dragSession.startY);
      if (totalDistance > TAP_MAX_DISTANCE) {
        dragSession.isTapCandidate = false;
      }

      const now = performance.now();
      const rawOffset = event.clientY - dragSession.startY;

      if (rawOffset <= DRAG_ACTIVATION_DISTANCE) {
        dragSession.lastY = event.clientY;
        dragSession.lastTs = now;
        dragSession.velocity = 0;
        dragSession.nextOffset = 0;
        if (dragSession.dragActivated) {
          dragSession.dragActivated = false;
          setIsDragging(false);
          dragY.set(0);
        }
        return;
      }

      if (!dragSession.dragActivated) {
        dragSession.dragActivated = true;
        setIsDragging(true);
      }

      const dt = Math.max(1, now - dragSession.lastTs);
      const deltaY = event.clientY - dragSession.lastY;
      const instantVelocity = Math.max(0, deltaY / dt);
      dragSession.velocity = dragSession.velocity * 0.62 + instantVelocity * 0.38;
      dragSession.lastY = event.clientY;
      dragSession.lastTs = now;

      const offset = Math.max(0, rawOffset - DRAG_ACTIVATION_DISTANCE);
      dragSession.nextOffset = offset;
      flushDragFrame();

      if (event.pointerType === "touch" && dragSession.dragActivated) {
        event.preventDefault();
      }
    },
    [dragY, flushDragFrame],
  );

  const onSurfacePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finalizeDrag(event.currentTarget, event.pointerId);
    },
    [finalizeDrag],
  );

  const onSurfacePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      finalizeDrag(event.currentTarget, event.pointerId);
    },
    [finalizeDrag],
  );

  const syncCurrentTime = useCallback(
    (seconds: number) => {
      const sync = timeSyncRef.current;
      sync.nextTime = seconds;

      if (sync.rafId) {
        return;
      }

      sync.rafId = window.requestAnimationFrame(() => {
        setCurrentTime(sync.nextTime);
        sync.rafId = 0;
      });
    },
    [setCurrentTime],
  );

  useEffect(() => {
    const sync = timeSyncRef.current;
    const dragSession = dragSessionRef.current;

    return () => {
      if (sync.rafId) {
        window.cancelAnimationFrame(sync.rafId);
      }

      if (dragSession.rafId) {
        window.cancelAnimationFrame(dragSession.rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (!skipFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearSkipFeedback();
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [clearSkipFeedback, skipFeedback]);

  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    const endScrub = () => setIsScrubbing(false);
    window.addEventListener("pointerup", endScrub);
    window.addEventListener("pointercancel", endScrub);

    return () => {
      window.removeEventListener("pointerup", endScrub);
      window.removeEventListener("pointercancel", endScrub);
    };
  }, [isScrubbing]);

  useEffect(() => {
    if (!pipNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPipNotice(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [pipNotice]);

  useEffect(() => {
    if (!nextCountdown || !currentVideo || nextCountdown.sourceId !== currentVideo.id) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNextCountdown((activeCountdown) => {
        if (!activeCountdown || activeCountdown.sourceId !== currentVideo.id) {
          return activeCountdown;
        }

        return {
          ...activeCountdown,
          remainingMs: activeCountdown.remainingMs - 100,
        };
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [currentVideo, nextCountdown]);

  useEffect(() => {
    if (!nextCountdown || !currentVideo || nextCountdown.sourceId !== currentVideo.id) {
      return;
    }

    if (nextCountdown.remainingMs > 0) {
      return;
    }

    const targetVideoId = nextCountdown.targetId;
    const timer = window.setTimeout(() => {
      switchVideo(targetVideoId);
      router.replace(`/watch/${targetVideoId}`);
      setNextCountdown(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [currentVideo, nextCountdown, router, switchVideo]);

  useEffect(() => {
    if (!nextVideo) {
      return;
    }

    router.prefetch(`/watch/${nextVideo.id}`);

    const previewImage = new window.Image();
    previewImage.src = getThumbnailUrl(nextVideo);
  }, [nextVideo, router]);

  useEffect(() => {
    if (!currentVideoId || duration > 0) {
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      const measuredDuration = playerRef.current?.getDuration?.();
      attempts += 1;

      if (typeof measuredDuration === "number" && Number.isFinite(measuredDuration) && measuredDuration > 0) {
        setDuration(measuredDuration);
        if (currentVideo) {
          upsertDuration(currentVideo.youtubeId, measuredDuration);
        }
        window.clearInterval(timer);
        return;
      }

      if (attempts >= 24) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, [currentVideo, currentVideoId, duration, setDuration, upsertDuration]);

  const prefetchVideoRoute = useCallback(
    (videoId: string) => {
      router.prefetch(`/watch/${videoId}`);
    },
    [router],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const maxDuration = duration > 0 ? duration : Number.POSITIVE_INFINITY;
      const nextTime = clamp(seconds, 0, maxDuration);
      const player = playerRef.current;

      if (player) {
        player.seekTo(nextTime, "seconds");
      }

      setCurrentTime(nextTime);
    },
    [duration, setCurrentTime],
  );

  const handleSeek = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      seekTo(Number(event.target.value));
    },
    [seekTo],
  );

  const handleSkip = useCallback(
    (delta: number) => {
      seekTo(currentTime + delta);
      showSkipFeedback(delta);
    },
    [currentTime, seekTo, showSkipFeedback],
  );

  const restore = useCallback(() => {
    if (!currentVideo) {
      return;
    }

    dragY.set(0);
    setMode("full");
    router.push(`/watch/${currentVideo.id}`);
  }, [currentVideo, dragY, router, setMode]);

  const close = useCallback(() => {
    closePlayer();
    setRelatedOpen(false);
    setIsDragging(false);
    setNextCountdown(null);
    dragY.set(0);
    resetGestureSession();

    if (pathname.startsWith("/watch/")) {
      router.push("/");
    }
  }, [closePlayer, dragY, pathname, resetGestureSession, router]);

  const handleRelatedSelect = useCallback(
    (videoId: string) => {
      switchVideo(videoId);
      setMode("full");
      setRelatedOpen(false);
      setNextCountdown(null);
      dragY.set(0);
      resetGestureSession();
      router.replace(`/watch/${videoId}`);
    },
    [dragY, resetGestureSession, router, setMode, switchVideo],
  );

  const handleEnded = useCallback(() => {
    if (!currentVideo || !nextVideo) {
      setPlaying(false);
      return;
    }

    setNextCountdown({
      sourceId: currentVideo.id,
      targetId: nextVideo.id,
      remainingMs: 2000,
    });
  }, [currentVideo, nextVideo, setPlaying]);

  const retryPlayback = useCallback(() => {
    if (!currentVideo) {
      return;
    }

    clearVideoError();
    openVideo(currentVideo.id, {
      autoplay: true,
      mode: mode === "mini" ? "mini" : "full",
      sourceCardId: currentVideo.id,
    });
  }, [clearVideoError, currentVideo, mode, openVideo]);

  const togglePiP = useCallback(async () => {
    if ("pictureInPictureElement" in document && document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setPipState("idle");
      return;
    }

    const internalPlayer = playerRef.current?.getInternalPlayer?.() as
      | HTMLVideoElement
      | undefined;

    if (
      !internalPlayer ||
      typeof internalPlayer.requestPictureInPicture !== "function"
    ) {
      setPipState("unsupported");
      setPipNotice("PiP is unavailable for YouTube embeds in this browser.");
      return;
    }

    try {
      await internalPlayer.requestPictureInPicture();
      setPipState("active");
    } catch {
      setPipState("error");
      setPipNotice("PiP request failed.");
    }
  }, [setPipState]);

  if (!currentVideo || mode === "hidden") {
    return null;
  }

  const knownDuration =
    duration > 0
      ? duration
      : durationByYoutubeId[currentVideo.youtubeId] ?? 0;
  const safeDuration = knownDuration > 0 ? knownDuration : Math.max(1, currentTime);
  const progressPercent =
    knownDuration > 0 ? Math.min(100, (currentTime / knownDuration) * 100) : 0;
  const activeCountdownSeconds =
    nextCountdown && nextCountdown.sourceId === currentVideo.id
      ? Math.max(1, Math.ceil(nextCountdown.remainingMs / 1000))
      : null;
  const canShowLoadingOverlay = isVideoLoading && !videoError;
  const layoutId = `video-surface-${currentVideo.id}`;
  const youtubeOrigin =
    typeof window === "undefined" ? undefined : window.location.origin;

  return (
    <AnimatePresence>
      <motion.section
        key="global-player"
        initial={{
          opacity: 0,
          y: mode === "mini" ? 24 : 0,
          scale: mode === "mini" ? 0.98 : 1,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        aria-label="Video player"
        className={cn(
          "fixed z-[70] overflow-hidden border border-slate-50/15 bg-[rgba(7,14,22,0.98)] text-slate-100 shadow-[0_14px_50px_rgba(2,8,16,0.65)] will-change-transform",
          mode === "full"
            ? "inset-0 rounded-none border-none lg:inset-4 lg:rounded-[2rem] lg:border lg:border-slate-100/10"
            : "left-2 right-2 h-[88px] rounded-2xl border-slate-100/20 bg-[rgba(8,16,25,0.96)] md:left-auto md:right-5 md:h-24 md:w-[430px]",
        )}
        style={mode === "mini" ? { bottom: "calc(0.45rem + env(safe-area-inset-bottom))" } : undefined}
        data-testid="global-player"
      >
        <div
          role={mode === "mini" ? "button" : undefined}
          tabIndex={mode === "mini" ? 0 : undefined}
          aria-label={mode === "mini" ? "Restore full player" : undefined}
          onClick={mode === "mini" ? restore : undefined}
          onKeyDown={
            mode === "mini"
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    restore();
                  }
                }
              : undefined
          }
          className={cn(
            "relative h-full w-full overflow-hidden",
            mode === "full" ? "flex flex-col" : "flex items-center",
          )}
        >
          <motion.div
            layoutId={layoutId}
            data-testid="player-surface"
            className={cn(
              "relative overflow-hidden bg-black will-change-transform",
              mode === "full"
                ? "aspect-video w-full touch-none lg:h-[46dvh] lg:aspect-auto"
                : "h-full w-28 shrink-0",
            )}
            style={
              mode === "full"
                ? {
                    y: dragY,
                    scale: dragScale,
                    opacity: dragOpacity,
                  }
                : undefined
            }
          >
            {mode === "full" ? (
              <div
                data-testid="player-gesture-layer"
                className="absolute inset-0 z-10 touch-none"
                onPointerDown={onSurfacePointerDown}
                onPointerMove={onSurfacePointerMove}
                onPointerUp={onSurfacePointerUp}
                onPointerCancel={onSurfacePointerCancel}
              />
            ) : null}

            <VideoErrorBoundary videoId={currentVideo.id} onRetry={retryPlayback}>
              <ReactPlayer
                ref={playerRef}
                url={getVideoUrl(currentVideo)}
                width="100%"
                height="100%"
                controls={false}
                playing={isPlaying}
                playsinline
                progressInterval={120}
                config={{
                  youtube: {
                    playerVars: {
                      playsinline: 1,
                      rel: 0,
                      modestbranding: 1,
                      origin: youtubeOrigin,
                    },
                  },
                }}
                onReady={() => {
                  setVideoReady();
                  clearVideoError();
                  const measuredDuration = playerRef.current?.getDuration?.();
                  if (typeof measuredDuration === "number" && Number.isFinite(measuredDuration) && measuredDuration > 0) {
                    setDuration(measuredDuration);
                    upsertDuration(currentVideo.youtubeId, measuredDuration);
                  }
                }}
                onPlay={() => {
                  setPlaying(true);
                  setVideoReady();
                }}
                onPause={() => setPlaying(false)}
                onEnded={handleEnded}
                onError={() => {
                  setVideoError("Unable to load this video. Try another clip.");
                }}
                onProgress={(progressState) => {
                  if (isScrubbing || isDragging) {
                    return;
                  }

                  if (!Number.isFinite(progressState.playedSeconds)) {
                    return;
                  }

                  syncCurrentTime(progressState.playedSeconds);

                  if (duration <= 0) {
                    const measuredDuration = playerRef.current?.getDuration?.();
                    if (typeof measuredDuration === "number" && Number.isFinite(measuredDuration) && measuredDuration > 0) {
                      setDuration(measuredDuration);
                    }
                  }
                }}
                onDuration={(seconds) => {
                  if (!Number.isFinite(seconds)) {
                    return;
                  }

                  setDuration(seconds);
                  upsertDuration(currentVideo.youtubeId, seconds);
                }}
                onEnablePIP={() => setPipState("active")}
                onDisablePIP={() => setPipState("idle")}
              />
            </VideoErrorBoundary>

            <AnimatePresence>
              {canShowLoadingOverlay ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-label="Loading video"
                  className="pointer-events-none absolute inset-0 z-20 bg-[rgba(2,8,14,0.76)]"
                >
                  <div className="h-full w-full bg-[linear-gradient(105deg,rgba(77,98,118,0.1)_20%,rgba(135,157,182,0.35)_48%,rgba(77,98,118,0.1)_78%)] bg-[length:220%_100%] animate-[shimmer_1.25s_linear_infinite]" />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {videoError ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[rgba(7,10,16,0.9)] px-4 text-center"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-rose-200">
                    Video unavailable
                  </p>
                  <p className="max-w-xs text-sm text-slate-200/90">{videoError}</p>
                  <button
                    type="button"
                    onClick={retryPlayback}
                    aria-label="Retry video playback"
                    className="rounded-full border border-slate-100/25 px-4 py-1.5 text-sm font-semibold"
                  >
                    Retry
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {mode === "full" && !isPlaying && !canShowLoadingOverlay && !videoError ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 z-[22] bg-[radial-gradient(circle_at_center,rgba(3,8,14,0.06),rgba(3,8,14,0.62))]"
                >
                  <div className="flex h-full items-center justify-center">
                    <span className="rounded-full border border-slate-100/30 bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-100">
                      Tap to play
                    </span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {mode === "full" ? (
              <button
                type="button"
                onClick={minimize}
                aria-label="Minimize player"
                className="absolute left-3 top-3 z-30 rounded-full border border-slate-100/25 bg-black/45 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur"
              >
                Minimize
              </button>
            ) : null}

            {mode === "full" ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center lg:hidden">
                <span className="rounded-full border border-slate-100/20 bg-black/35 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.09em] text-slate-200/90">
                  Drag Down
                </span>
              </div>
            ) : null}

            <AnimatePresence>
              {skipFeedback ? (
                <motion.div
                  key={skipFeedback.token}
                  initial={{ opacity: 0, scale: 0.84 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                >
                  <div className="rounded-full border border-slate-200/20 bg-black/60 px-4 py-2 text-xl font-bold text-slate-50 shadow-xl">
                    {skipFeedback.delta > 0 ? "+" : ""}
                    {skipFeedback.delta}s
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {mode === "full" ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 hidden lg:block">
                <div className="bg-gradient-to-t from-black/88 via-black/55 to-transparent px-4 pb-3 pt-10">
                  <div className="pointer-events-auto flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPlaying(!isPlaying)}
                      aria-label={isPlaying ? "Pause video" : "Play video"}
                      className="rounded-full border border-slate-100/20 bg-black/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-100 backdrop-blur"
                    >
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-100/90">
                      {formatTime(currentTime)} /{" "}
                      {knownDuration > 0 ? formatTime(knownDuration) : "--:--"}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-500/45">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#31d0aa,#5da8ff)] transition-[width] duration-150"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>

          {mode === "full" ? (
            <div className="relative flex flex-1 overflow-hidden lg:flex-row">
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    "z-10 px-4 pb-[calc(6.4rem+env(safe-area-inset-bottom))] pt-3 lg:flex-1 lg:overflow-y-auto lg:px-5 lg:pb-[calc(1.2rem+env(safe-area-inset-bottom))] lg:pt-4",
                    isDragging ? "pointer-events-none select-none" : undefined,
                  )}
                  data-gesture-ignore="true"
                >
                  <div className="rounded-2xl border border-slate-100/14 bg-[linear-gradient(150deg,rgba(16,30,44,0.88),rgba(11,20,30,0.84))] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur lg:mx-auto lg:w-full lg:max-w-4xl lg:rounded-3xl lg:p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg leading-tight text-slate-100 lg:text-xl">
                          {currentVideo.title}
                        </h2>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300/75">
                          {currentVideo.category}
                        </p>
                        <p className="mt-1 hidden text-[0.66rem] uppercase tracking-[0.1em] text-slate-300/60 lg:block">
                          Related videos stay visible in the right panel.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                          type="button"
                          onClick={close}
                          aria-label="Close player"
                          className="rounded-full border border-slate-100/25 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-100/10"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-2 lg:max-w-xl">
                      <button
                        type="button"
                        onClick={() => handleSkip(-10)}
                        aria-label="Skip backward 10 seconds"
                        className="rounded-xl border border-slate-100/15 bg-slate-900/55 px-2 py-2.5 text-sm font-semibold transition hover:bg-slate-100/10"
                      >
                        {"<< 10"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaying(!isPlaying)}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                        className="rounded-xl border border-[#31d0aa]/45 bg-[#31d0aa]/16 px-2 py-2.5 text-sm font-semibold text-[#9af2df] transition hover:bg-[#31d0aa]/28"
                      >
                        {isPlaying ? "Pause" : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSkip(10)}
                        aria-label="Skip forward 10 seconds"
                        className="rounded-xl border border-slate-100/15 bg-slate-900/55 px-2 py-2.5 text-sm font-semibold transition hover:bg-slate-100/10"
                      >
                        {"10 >>"}
                      </button>
                      <button
                        type="button"
                        onClick={togglePiP}
                        aria-label="Toggle picture in picture"
                        className="rounded-xl border border-slate-100/15 bg-slate-900/55 px-2 py-2.5 text-sm font-semibold transition hover:bg-slate-100/10"
                      >
                        PiP
                      </button>
                    </div>

                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-500/35" />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#31d0aa,#5da8ff)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={safeDuration}
                        step={0.1}
                        value={Math.min(currentTime, safeDuration)}
                        onChange={handleSeek}
                        onPointerDown={() => setIsScrubbing(true)}
                        onPointerUp={() => setIsScrubbing(false)}
                        onPointerCancel={() => setIsScrubbing(false)}
                        disabled={knownDuration <= 0}
                        aria-label="Seek video timeline"
                        className="relative h-6 w-full cursor-pointer appearance-none bg-transparent"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                      <span aria-label="Current playback time">{formatTime(currentTime)}</span>
                      <span aria-label="Video duration">
                        {knownDuration > 0 ? formatTime(knownDuration) : "--:--"}
                      </span>
                    </div>

                    <AnimatePresence>
                      {activeCountdownSeconds && nextVideo ? (
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="mt-3 rounded-xl border border-[#31d0aa]/35 bg-[#10283a] px-3 py-2"
                        >
                          <p aria-live="polite" className="text-sm text-slate-200">
                            Up next in {activeCountdownSeconds}s: {nextVideo.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => setNextCountdown(null)}
                            aria-label="Cancel autoplay next video"
                            className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#7decd1]"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <AnimatePresence>
                      {pipNotice ? (
                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          aria-live="polite"
                          className="mt-2 text-xs text-amber-200"
                        >
                          {pipNotice}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>

                    {pipState === "active" ? (
                      <p
                        aria-live="polite"
                        className="mt-1 text-[0.7rem] uppercase tracking-[0.09em] text-[#7decd1]"
                      >
                        Picture-in-picture active
                      </p>
                    ) : null}
                  </div>
                </div>

                <AnimatePresence>
                  {relatedOpen ? (
                    <motion.button
                      type="button"
                      aria-label="Close related videos"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.42 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setRelatedOpen(false)}
                      className="absolute inset-0 z-20 bg-black/75 lg:hidden"
                    />
                  ) : null}
                </AnimatePresence>

                <div className="lg:hidden">
                  <RelatedSheet
                    category={currentVideo.category}
                    activeVideoId={currentVideo.id}
                    isOpen={relatedOpen}
                    relatedVideos={relatedVideos}
                    durationByYoutubeId={durationByYoutubeId}
                    onOpenChange={setRelatedOpen}
                    onSelect={handleRelatedSelect}
                    onPrefetch={prefetchVideoRoute}
                  />
                </div>
              </div>

              <RelatedSidebar
                category={currentVideo.category}
                activeVideoId={currentVideo.id}
                relatedVideos={relatedVideos}
                durationByYoutubeId={durationByYoutubeId}
                onSelect={handleRelatedSelect}
                onPrefetch={prefetchVideoRoute}
              />
            </div>
          ) : (
            <div className="relative flex flex-1 items-center justify-between gap-2 px-2.5 py-2 md:gap-3 md:px-4">
              <div className="min-w-0 pr-1">
                <p className="truncate text-sm font-semibold text-slate-50">
                  {currentVideo.title}
                </p>
                <p className="truncate text-[0.65rem] uppercase tracking-[0.1em] text-slate-300/85">
                  {currentVideo.category}{" "}
                  {knownDuration > 0
                    ? `| ${formatTime(currentTime)} / ${formatTime(knownDuration)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPlaying(!isPlaying);
                  }}
                  aria-label={isPlaying ? "Pause mini player" : "Play mini player"}
                  className="rounded-lg border border-[#31d0aa]/45 bg-[#31d0aa]/16 px-2.5 py-1.5 text-[0.68rem] font-semibold text-[#9af2df]"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    close();
                  }}
                  aria-label="Close mini player"
                  className="rounded-lg border border-slate-100/20 bg-slate-900/40 px-2.5 py-1.5 text-[0.68rem] font-semibold"
                >
                  X
                </button>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-slate-500/35">
                <div
                  className="h-full bg-[linear-gradient(90deg,#31d0aa,#5da8ff)] transition-[width] duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
