import type { CampaignTrack } from "@/types/audio";

/** Куди веде трек: YouTube-відео або публічний файл у сховищі */
export function trackLink(track: Pick<CampaignTrack, "kind" | "url" | "youtubeId">): string | null {
  if (track.kind === "youtube") return track.youtubeId ? `https://youtu.be/${track.youtubeId}` : null;

  return track.url;
}
