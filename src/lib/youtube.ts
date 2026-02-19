export type YouTubeMetadataItem = {
  youtubeId: string;
  durationSeconds: number;
  title?: string;
};

export function parseYouTubeDurationToSeconds(durationIso8601: string) {
  const match = durationIso8601.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i,
  );

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}
