"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Virtuoso } from "react-virtuoso";

import { getThumbnailUrl } from "@/data/videos";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/time";
import type { Video } from "@/types/video";

const SHEET_HEIGHT = 360;
const PEEK_HEIGHT = 72;
const CLOSED_Y = SHEET_HEIGHT - PEEK_HEIGHT;

type RelatedSheetProps = {
  category: string;
  activeVideoId: string;
  isOpen: boolean;
  relatedVideos: Video[];
  durationByYoutubeId?: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSelect: (videoId: string) => void;
  onPrefetch?: (videoId: string) => void;
};

export function RelatedSheet({
  category,
  activeVideoId,
  isOpen,
  relatedVideos,
  durationByYoutubeId,
  onOpenChange,
  onSelect,
  onPrefetch,
}: RelatedSheetProps) {
  const relatedCount = relatedVideos.length;

  return (
    <motion.aside className="pointer-events-none absolute inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl">
      <motion.div
        className="pointer-events-auto mx-3 overflow-hidden rounded-t-3xl border border-slate-100/15 bg-[linear-gradient(170deg,rgba(15,31,48,0.98),rgba(12,23,35,0.96))] shadow-[0_-14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl will-change-transform"
        style={{ height: SHEET_HEIGHT }}
        animate={{ y: isOpen ? 0 : CLOSED_Y }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: CLOSED_Y }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y > 70 || info.velocity.y > 700) {
            onOpenChange(false);
            return;
          }

          if (info.offset.y < -70 || info.velocity.y < -700) {
            onOpenChange(true);
          }
        }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="related-video-list"
          aria-label={`${isOpen ? "Hide" : "Show"} related videos in ${category}`}
          className="flex h-[72px] w-full flex-col items-center justify-center gap-1 border-b border-slate-100/10 bg-[rgba(13,24,37,0.92)] touch-none"
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300/65" />
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-300">
            Related in {category}
          </p>
          <p className="text-[0.62rem] uppercase tracking-[0.1em] text-slate-400/90">
            {relatedCount} videos
          </p>
        </button>

        {relatedVideos.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-300">
            No related videos in this category.
          </div>
        ) : (
          <Virtuoso<Video, undefined>
            id="related-video-list"
            style={{ height: SHEET_HEIGHT - PEEK_HEIGHT }}
            data={relatedVideos}
            increaseViewportBy={420}
            itemContent={(_, video) => (
              <button
                type="button"
                onPointerEnter={() => onPrefetch?.(video.id)}
                onTouchStart={() => onPrefetch?.(video.id)}
                onFocus={() => onPrefetch?.(video.id)}
                onClick={() => onSelect(video.id)}
                aria-label={`Play related video ${video.title}`}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-200",
                  "hover:bg-[#1a3047] focus-visible:bg-[#1a3047]",
                  video.id === activeVideoId
                    ? "bg-[#1a3047] ring-1 ring-inset ring-[#5bd7bb]/45"
                    : undefined,
                )}
              >
                <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border border-slate-100/15 bg-slate-950">
                  <Image
                    src={getThumbnailUrl(video)}
                    alt={video.title}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {video.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-300/75">{video.category}</p>
                </div>
                <span className="text-xs text-slate-300/75">
                  {formatTime(durationByYoutubeId?.[video.youtubeId] ?? video.duration)}
                </span>
              </button>
            )}
            components={{
              Footer: () => <div className="h-4" />,
            }}
          />
        )}
      </motion.div>
    </motion.aside>
  );
}
