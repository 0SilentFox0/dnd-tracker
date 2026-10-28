import type { CampaignTrack as TrackRow } from "@prisma/client";

import "server-only";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { prisma } from "@/lib/db";
import type { AudioLibraryEntry } from "@/lib/utils/audio/audio-command";
import type { BattleAudioTrack, CampaignTrack, TrackKind } from "@/types/audio";

export const TRACK_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export const toBattleAudioTrack = (row: Pick<TrackRow, "title" | "kind" | "url" | "youtubeId" | "durationSec">): BattleAudioTrack => ({
  title: row.title,
  kind: row.kind as TrackKind,
  url: row.url,
  youtubeId: row.youtubeId,
  durationSec: row.durationSec,
});

export function toCampaignTrack(row: TrackRow): CampaignTrack {
  return { id: row.id, ...toBattleAudioTrack(row), sortOrder: row.sortOrder, createdAt: row.createdAt.toISOString() };
}

export async function listTracks(campaignId: string): Promise<CampaignTrack[]> {
  return (await prisma.campaignTrack.findMany({ where: { campaignId }, orderBy: TRACK_ORDER })).map(toCampaignTrack);
}

export async function loadAudioLibrary(campaignId: string): Promise<AudioLibraryEntry[]> {
  const rows = await prisma.campaignTrack.findMany({
    where: { campaignId },
    orderBy: TRACK_ORDER,
    select: { id: true, title: true, kind: true, url: true, youtubeId: true, durationSec: true },
  });

  return rows.map((row) => ({ id: row.id, track: toBattleAudioTrack(row) }));
}

export const isLibraryFull = async (campaignId: string) => (await prisma.campaignTrack.count({ where: { campaignId } })) >= MAX_TRACKS_PER_CAMPAIGN;
