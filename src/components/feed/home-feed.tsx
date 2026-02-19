"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupedVirtuoso } from "react-virtuoso";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { groupedVideos } from "@/data/videos";
import { cn } from "@/lib/cn";
import { usePlayerStore } from "@/store/player-store";
import { useVideoMetadataStore } from "@/store/video-metadata-store";
import { VIDEO_CATEGORIES, type Video, type VideoCategory } from "@/types/video";
import { VideoCard } from "./video-card";

const FLAT_VIDEOS = groupedVideos.flatMap((group) => group.videos);
const UNIQUE_YOUTUBE_IDS = Array.from(
  new Set(FLAT_VIDEOS.map((video) => video.youtubeId)),
);

export function HomeFeed() {
  const router = useRouter();
  const mode = usePlayerStore((state) => state.mode);
  const openVideo = usePlayerStore((state) => state.openVideo);
  const isVideoLoading = usePlayerStore((state) => state.isVideoLoading);
  const durationByYoutubeId = useVideoMetadataStore(
    (state) => state.durationByYoutubeId,
  );
  const metadataStatus = useVideoMetadataStore((state) => state.status);
  const hydrateMetadata = useVideoMetadataStore((state) => state.hydrate);
  const [activeCategory, setActiveCategory] = useState<VideoCategory | "All">("All");

  const footerHeight = mode === "mini" ? 118 : 24;

  const handleOpen = useCallback(
    (videoId: string) => {
      openVideo(videoId, {
        autoplay: true,
        mode: "full",
        sourceCardId: videoId,
      });

      window.setTimeout(() => {
        router.push(`/watch/${videoId}`);
      }, 110);
    },
    [openVideo, router],
  );

  const handlePrefetch = useCallback(
    (videoId: string) => {
      router.prefetch(`/watch/${videoId}`);
    },
    [router],
  );

  useEffect(() => {
    if (metadataStatus !== "idle") {
      return;
    }

    void hydrateMetadata(UNIQUE_YOUTUBE_IDS);
  }, [hydrateMetadata, metadataStatus]);

  const visibleGroups = useMemo(
    () =>
      activeCategory === "All"
        ? groupedVideos
        : groupedVideos.filter((group) => group.category === activeCategory),
    [activeCategory],
  );
  const groupLabels = useMemo(
    () => visibleGroups.map((group) => group.category),
    [visibleGroups],
  );
  const flatVideos = useMemo(
    () => visibleGroups.flatMap((group) => group.videos),
    [visibleGroups],
  );
  const groupCounts = useMemo(
    () => visibleGroups.map((group) => group.videos.length),
    [visibleGroups],
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative min-h-screen px-2 pt-[calc(0.6rem+env(safe-area-inset-top))] sm:px-4 sm:pt-4"
    >
      <div className="mx-auto w-full max-w-[1320px] lg:grid lg:grid-cols-[292px_minmax(0,1fr)] lg:items-start lg:gap-5">
        <header className="sticky top-[max(0.35rem,env(safe-area-inset-top))] z-20 mb-3 rounded-3xl border border-slate-200/15 bg-[linear-gradient(135deg,rgba(20,39,59,0.9),rgba(13,25,35,0.94))] px-4 py-4 shadow-[0_12px_34px_rgba(3,10,20,0.5)] backdrop-blur-xl lg:top-4 lg:mb-0 lg:h-[calc(100dvh-2rem)] lg:overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[0.67rem] uppercase tracking-[0.15em] text-[#79e7ce]">
                Dino Stream
              </p>
              <h1 className="mt-1 font-display text-xl leading-tight tracking-tight text-slate-50 lg:text-2xl">
                Video Feed
              </h1>
              <p className="mt-1 text-sm text-slate-300/90">
                Explore by category, jump in fast, and keep playback pinned while browsing.
              </p>
              <p
                aria-live="polite"
                className={cn(
                  "mt-1 text-[0.66rem] uppercase tracking-[0.1em] transition-opacity",
                  isVideoLoading ? "opacity-100 text-[#8eefd9]" : "opacity-0",
                )}
              >
                Opening video...
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 lg:flex-col lg:items-stretch lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 lg:pr-1">
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              aria-pressed={activeCategory === "All"}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition lg:w-full lg:text-left",
                activeCategory === "All"
                  ? "border-[#31d0aa]/55 bg-[#31d0aa]/22 text-[#a0f4e3]"
                  : "border-slate-100/20 bg-slate-900/30 text-slate-300 hover:bg-slate-100/10",
              )}
            >
              All
            </button>
            {VIDEO_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition lg:w-full lg:text-left",
                  activeCategory === category
                    ? "border-[#31d0aa]/55 bg-[#31d0aa]/22 text-[#a0f4e3]"
                    : "border-slate-100/20 bg-slate-900/30 text-slate-300 hover:bg-slate-100/10",
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.09em] text-slate-300/85">
            <span className="rounded-full border border-slate-100/20 bg-slate-900/30 px-2.5 py-1">
              {flatVideos.length} Videos
            </span>
            <span className="rounded-full border border-slate-100/20 bg-slate-900/30 px-2.5 py-1">
              Metadata {metadataStatus}
            </span>
          </div>

        </header>

        <section className="min-w-0">
          <div className="mb-3 hidden items-center justify-between rounded-2xl border border-slate-100/15 bg-[rgba(9,18,28,0.64)] px-4 py-2.5 text-xs uppercase tracking-[0.09em] text-slate-300/80 lg:flex">
            <span>Optimized desktop feed</span>
            <span>{activeCategory === "All" ? "All categories" : activeCategory}</span>
          </div>

          <div className="h-[calc(100dvh-7.4rem)] lg:h-[calc(100dvh-6.2rem)] lg:rounded-3xl lg:border lg:border-slate-100/10 lg:bg-[rgba(8,15,24,0.45)] lg:p-2">
            <GroupedVirtuoso<Video, undefined>
              className="h-full"
              data={flatVideos}
              groupCounts={groupCounts}
              increaseViewportBy={560}
              groupContent={(groupIndex) => (
                <div className="sticky top-0 z-10 px-1 pb-2 pt-1.5">
                  <div className="rounded-xl border border-slate-200/15 bg-[rgba(11,20,34,0.88)] px-3 py-2 backdrop-blur-xl">
                    <span className="font-display text-xs uppercase tracking-[0.12em] text-slate-300">
                      {groupLabels[groupIndex]}
                    </span>
                  </div>
                </div>
              )}
              itemContent={(itemIndex, __, video) => (
                <div className="px-1 pb-3">
                  <VideoCard
                    video={video}
                    displayDuration={durationByYoutubeId[video.youtubeId] ?? video.duration}
                    onOpen={handleOpen}
                    onPrefetch={handlePrefetch}
                    eager={itemIndex < 3}
                  />
                </div>
              )}
              components={{
                Footer: () => (
                  <div
                    className={cn("transition-all duration-250")}
                    style={{ height: footerHeight }}
                  />
                ),
              }}
            />
          </div>
        </section>
      </div>
    </motion.main>
  );
}
