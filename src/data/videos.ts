import { VIDEO_CATEGORIES, type Video, type VideoSeed } from "@/types/video";

const LIBRARY_CYCLES = 10;

const SEED_VIDEOS: VideoSeed[] = [
  {
    title: "How T-Rex Tracked Prey",
    youtubeId: "M7lc1UVf-VE",
    duration: 244,
    category: "Jurassic Facts",
  },
  {
    title: "Fastest Raptors Ever Recorded",
    youtubeId: "ScMzIvxBSi4",
    duration: 315,
    category: "Jurassic Facts",
  },
  {
    title: "Stegosaurus Defense Patterns",
    youtubeId: "aqz-KE-bpKQ",
    duration: 268,
    category: "Jurassic Facts",
  },
  {
    title: "Museum Fossil Restoration",
    youtubeId: "jNQXAC9IVRw",
    duration: 216,
    category: "Fossil Labs",
  },
  {
    title: "Amber DNA Analysis Session",
    youtubeId: "M7lc1UVf-VE",
    duration: 329,
    category: "Fossil Labs",
  },
  {
    title: "Ice Age Dig Site Walkthrough",
    youtubeId: "ScMzIvxBSi4",
    duration: 190,
    category: "Fossil Labs",
  },
  {
    title: "A Day in Cretaceous Valley",
    youtubeId: "aqz-KE-bpKQ",
    duration: 282,
    category: "Paleo Stories",
  },
  {
    title: "Young Triceratops Survival Story",
    youtubeId: "jNQXAC9IVRw",
    duration: 226,
    category: "Paleo Stories",
  },
  {
    title: "The Last Night of the Herd",
    youtubeId: "M7lc1UVf-VE",
    duration: 257,
    category: "Paleo Stories",
  },
  {
    title: "Raptor Canyon Escape Drill",
    youtubeId: "ScMzIvxBSi4",
    duration: 203,
    category: "Dino Action",
  },
  {
    title: "Volcanic Run Sequence",
    youtubeId: "aqz-KE-bpKQ",
    duration: 178,
    category: "Dino Action",
  },
  {
    title: "Ankylosaurus Power Challenge",
    youtubeId: "jNQXAC9IVRw",
    duration: 272,
    category: "Dino Action",
  },
];

export const videos: Video[] = Array.from(
  { length: SEED_VIDEOS.length * LIBRARY_CYCLES },
  (_, index) => {
    const seed = SEED_VIDEOS[index % SEED_VIDEOS.length];
    const cycle = Math.floor(index / SEED_VIDEOS.length) + 1;

    return {
      ...seed,
      id: `${seed.youtubeId}-${index + 1}`,
      title: cycle === 1 ? seed.title : `${seed.title} Vol.${cycle}`,
    };
  },
);

const videosById = new Map(videos.map((video) => [video.id, video]));

export const groupedVideos = VIDEO_CATEGORIES.map((category) => ({
  category,
  videos: videos.filter((video) => video.category === category),
}));

export function getVideoById(videoId: string | null | undefined) {
  if (!videoId) {
    return null;
  }

  return videosById.get(videoId) ?? null;
}

export function hasVideo(videoId: string) {
  return videosById.has(videoId);
}

export function getVideoUrl(video: Video) {
  return `https://www.youtube.com/watch?v=${video.youtubeId}`;
}

export function getThumbnailUrl(video: Video) {
  return `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
}

export function getRelatedVideos(videoId: string, limit = 40) {
  const currentVideo = getVideoById(videoId);

  if (!currentVideo) {
    return [];
  }

  return videos
    .filter(
      (video) =>
        video.id !== currentVideo.id && video.category === currentVideo.category,
    )
    .slice(0, limit);
}

export function getNextVideo(videoId: string) {
  const currentVideo = getVideoById(videoId);

  if (!currentVideo) {
    return null;
  }

  const currentGlobalIndex = videos.findIndex((video) => video.id === videoId);
  if (currentGlobalIndex < 0) {
    return null;
  }

  const categoryVideos = videos.filter(
    (video) => video.category === currentVideo.category,
  );
  const currentCategoryIndex = categoryVideos.findIndex(
    (video) => video.id === videoId,
  );

  if (
    currentCategoryIndex >= 0 &&
    currentCategoryIndex < categoryVideos.length - 1
  ) {
    return categoryVideos[currentCategoryIndex + 1];
  }

  if (currentGlobalIndex >= videos.length - 1) {
    return null;
  }

  return videos[currentGlobalIndex + 1];
}
