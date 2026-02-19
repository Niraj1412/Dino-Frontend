"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { memo, useState } from "react";

import { getThumbnailUrl } from "@/data/videos";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { Video } from "@/types/video";

type VideoCardProps = {
  video: Video;
  displayDuration: number;
  onOpen: (videoId: string) => void;
  onPrefetch?: (videoId: string) => void;
  eager?: boolean;
};

function VideoCardComponent({
  video,
  displayDuration,
  onOpen,
  onPrefetch,
  eager = false,
}: VideoCardProps) {
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);

  const actionLabel = `${video.title}, ${video.category}, ${formatTime(displayDuration)}`;

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(video.id)}
      onPointerEnter={() => onPrefetch?.(video.id)}
      onTouchStart={() => onPrefetch?.(video.id)}
      onFocus={() => onPrefetch?.(video.id)}
      aria-label={actionLabel}
      aria-busy={!isThumbnailLoaded}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group w-full text-left will-change-transform focus-visible:outline-none"
    >
      <article className="overflow-hidden rounded-3xl border border-slate-200/20 bg-[linear-gradient(145deg,rgba(18,35,54,0.94),rgba(12,24,37,0.9))] shadow-[0_12px_36px_rgba(3,8,15,0.46)] backdrop-blur-xl transition duration-300 group-hover:border-slate-100/30 group-focus-visible:border-slate-100/30 md:grid md:grid-cols-[minmax(260px,36%)_minmax(0,1fr)]">
        <motion.div
          layoutId={`video-surface-${video.id}`}
          className="relative aspect-video w-full overflow-hidden bg-slate-900 will-change-transform md:h-full md:min-h-[178px] md:aspect-auto"
        >
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 bg-[linear-gradient(110deg,rgba(74,98,118,0.2)_22%,rgba(142,163,182,0.38)_50%,rgba(74,98,118,0.2)_77%)] bg-[length:200%_100%] animate-[shimmer_1.35s_linear_infinite] transition-opacity",
              isThumbnailLoaded ? "opacity-0" : "opacity-100",
            )}
          />
          <Image
            src={getThumbnailUrl(video)}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            onLoad={() => setIsThumbnailLoaded(true)}
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.03]",
              isThumbnailLoaded ? "opacity-100" : "opacity-0",
            )}
            priority={false}
          />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/78 via-black/40 to-transparent" />
          <span className="absolute left-2 top-2 rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-slate-100 backdrop-blur">
            Play
          </span>
          <span className="absolute bottom-2 right-2 rounded-md border border-white/15 bg-black/65 px-2 py-1 text-xs font-medium text-slate-100 backdrop-blur">
            {formatTime(displayDuration)}
          </span>
        </motion.div>

        <div className="p-3 md:flex md:min-w-0 md:flex-col md:justify-between md:p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 flex-1 font-display text-[0.98rem] leading-snug tracking-tight text-slate-100">
              {video.title}
            </h3>
            <span className="rounded-full border border-[#31d0aa]/45 bg-[#31d0aa]/16 px-2 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.09em] text-[#98f4df]">
              {video.category}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.1em] text-slate-300/85">
            <span>{formatTime(displayDuration)}</span>
            <span className="rounded-full border border-slate-100/15 bg-slate-900/35 px-2 py-1 text-[0.62rem] font-semibold text-slate-200/90">
              Tap to play
            </span>
          </div>
        </div>
      </article>
    </motion.button>
  );
}

export const VideoCard = memo(VideoCardComponent);
