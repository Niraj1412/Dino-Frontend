"use client";

import Image from "next/image";
import { Virtuoso } from "react-virtuoso";

import { getThumbnailUrl } from "@/data/videos";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/time";
import type { Video } from "@/types/video";

type RelatedSidebarProps = {
  category: string;
  activeVideoId: string;
  relatedVideos: Video[];
  durationByYoutubeId?: Record<string, number>;
  onSelect: (videoId: string) => void;
  onPrefetch?: (videoId: string) => void;
};

export function RelatedSidebar({
  category,
  activeVideoId,
  relatedVideos,
  durationByYoutubeId,
  onSelect,
  onPrefetch,
}: RelatedSidebarProps) {
  return (
    <aside className="hidden h-full w-[350px] shrink-0 border-l border-slate-100/10 bg-[linear-gradient(175deg,rgba(10,22,34,0.98),rgba(8,16,24,0.95))] lg:flex lg:flex-col">
      <div className="border-b border-slate-100/10 px-4 py-3">
        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.11em] text-[#7decd1]">
          Related Videos
        </p>
        <p className="mt-1 font-display text-sm uppercase tracking-[0.08em] text-slate-100">
          {category}
        </p>
        <p className="mt-0.5 text-[0.7rem] uppercase tracking-[0.09em] text-slate-300/75">
          {relatedVideos.length} suggestions
        </p>
      </div>

      {relatedVideos.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-300">
          No related videos in this category.
        </div>
      ) : (
        <Virtuoso<Video, undefined>
          className="h-full"
          data={relatedVideos}
          increaseViewportBy={480}
          itemContent={(_, video) => (
            <button
              type="button"
              onPointerEnter={() => onPrefetch?.(video.id)}
              onFocus={() => onPrefetch?.(video.id)}
              onClick={() => onSelect(video.id)}
              aria-label={`Play related video ${video.title}`}
              className={cn(
                "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-[#173047] focus-visible:bg-[#173047]",
                video.id === activeVideoId
                  ? "bg-[#173047] ring-1 ring-inset ring-[#5bd7bb]/45"
                  : undefined,
              )}
            >
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-100/15 bg-black">
                <Image
                  src={getThumbnailUrl(video)}
                  alt={video.title}
                  fill
                  sizes="140px"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-1 right-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[0.62rem] font-semibold text-slate-100">
                  {formatTime(durationByYoutubeId?.[video.youtubeId] ?? video.duration)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
                  {video.title}
                </p>
                <p className="mt-1 text-[0.66rem] uppercase tracking-[0.1em] text-slate-300/80">
                  {video.category}
                </p>
              </div>
            </button>
          )}
          components={{
            Footer: () => <div className="h-4" />,
          }}
        />
      )}
    </aside>
  );
}
