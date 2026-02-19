"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { hasVideo } from "@/data/videos";
import { usePlayerStore } from "@/store/player-store";

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params.id;
  const videoId = Array.isArray(rawId) ? rawId[0] : rawId;

  const currentVideoId = usePlayerStore((state) => state.currentVideoId);
  const mode = usePlayerStore((state) => state.mode);
  const openVideo = usePlayerStore((state) => state.openVideo);
  const setMode = usePlayerStore((state) => state.setMode);

  useEffect(() => {
    if (!videoId) {
      return;
    }

    if (!hasVideo(videoId)) {
      router.replace("/");
      return;
    }

    if (currentVideoId !== videoId || mode === "hidden") {
      openVideo(videoId, {
        autoplay: true,
        mode: "full",
        sourceCardId: videoId,
      });
      return;
    }

    if (mode === "mini") {
      return;
    }

    if (mode !== "full") {
      setMode("full");
    }
  }, [currentVideoId, mode, openVideo, router, setMode, videoId]);

  return <div className="min-h-screen" />;
}
