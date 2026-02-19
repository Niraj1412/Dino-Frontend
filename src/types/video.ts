export const VIDEO_CATEGORIES = [
  "Jurassic Facts",
  "Fossil Labs",
  "Paleo Stories",
  "Dino Action",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export type Video = {
  id: string;
  title: string;
  youtubeId: string;
  duration: number;
  category: VideoCategory;
};

export type VideoSeed = Omit<Video, "id">;
