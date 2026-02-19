import { NextResponse } from "next/server";

import { videos } from "@/data/videos";
import {
  parseYouTubeDurationToSeconds,
  type YouTubeMetadataItem,
} from "@/lib/youtube";

type YouTubeApiItem = {
  id: string;
  snippet?: {
    title?: string;
  };
  contentDetails?: {
    duration?: string;
  };
};

const MAX_IDS_PER_REQUEST = 50;

function getUniqueVideoIds(rawIds: string | null) {
  const sourceIds =
    rawIds?.split(",").map((value) => value.trim()).filter(Boolean) ??
    Array.from(new Set(videos.map((video) => video.youtubeId)));

  return Array.from(new Set(sourceIds)).slice(0, MAX_IDS_PER_REQUEST);
}

export async function GET(request: Request) {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  const { searchParams } = new URL(request.url);
  const ids = getUniqueVideoIds(searchParams.get("ids"));

  if (ids.length === 0) {
    return NextResponse.json({
      items: [] satisfies YouTubeMetadataItem[],
      source: "empty",
    });
  }

  if (!apiKey) {
    return NextResponse.json({
      items: [] satisfies YouTubeMetadataItem[],
      source: "fallback",
      reason: "missing_api_key",
    });
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "contentDetails,snippet");
  endpoint.searchParams.set("id", ids.join(","));
  endpoint.searchParams.set("key", apiKey);

  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          items: [] satisfies YouTubeMetadataItem[],
          source: "fallback",
          reason: `youtube_error_${response.status}`,
        },
        { status: 200 },
      );
    }

    const payload = (await response.json()) as { items?: YouTubeApiItem[] };
    const items: YouTubeMetadataItem[] = [];

    for (const entry of payload.items ?? []) {
      const durationSeconds = parseYouTubeDurationToSeconds(
        entry.contentDetails?.duration ?? "",
      );

      if (!entry.id || durationSeconds <= 0) {
        continue;
      }

      items.push({
        youtubeId: entry.id,
        durationSeconds,
        title: entry.snippet?.title,
      });
    }

    return NextResponse.json({
      items,
      source: "youtube",
      requestedCount: ids.length,
    });
  } catch {
    return NextResponse.json(
      {
        items: [] satisfies YouTubeMetadataItem[],
        source: "fallback",
        reason: "request_failed",
      },
      { status: 200 },
    );
  }
}
