import { campaignPost, campaignPut, createCampaignCrudApi } from "./client";

import { TRACK_CACHE_SECONDS, TRACK_FORMATS } from "@/lib/constants/music";
import { createClient } from "@/lib/supabase/client";
import { validateTrackFile } from "@/lib/utils/audio/track-file";
import type { CampaignTrack, CreateTrackData, TrackUploadRequest, TrackUploadTicket, UpdateTrackData } from "@/types/audio";

const tracksApi = createCampaignCrudApi<CampaignTrack, CreateTrackData, UpdateTrackData, { ok: true }>("/tracks", { listCache: "no-store" });

export const getTracks = tracksApi.list;
export const createTrack = tracksApi.create;
export const updateTrack = tracksApi.update;
export const deleteTrack = tracksApi.remove;

export function reorderTracks(campaignId: string, ids: string[]): Promise<CampaignTrack[]> {
  return campaignPut<CampaignTrack[]>(campaignId, "/tracks/order", { ids });
}

/** Файл іде з браузера прямо в Storage: тіло запиту до Vercel обмежене 4,5 МБ. */
export async function uploadTrackFile(campaignId: string, file: File, meta: { title: string; durationSec: number | null }): Promise<CampaignTrack> {
  const checked = validateTrackFile(file);

  if (!checked.ok) throw new Error(checked.message);

  const request: TrackUploadRequest = { name: file.name, size: file.size, contentType: TRACK_FORMATS[checked.value].contentType };

  const ticket = await campaignPost<TrackUploadTicket>(campaignId, "/tracks/upload-url", request);

  // Storage бере MIME з частини FormData, а браузер дає для .m4a «audio/x-m4a» або "" — перетипізовуємо за квитком
  const body = new Blob([file], { type: ticket.contentType });

  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, body, { contentType: ticket.contentType, cacheControl: TRACK_CACHE_SECONDS });

  if (error) throw new Error(`Не вдалося завантажити файл: ${error.message}`);

  return createTrack(campaignId, { kind: "file", path: ticket.path, title: meta.title, ...(meta.durationSec ? { durationSec: Math.max(1, Math.round(meta.durationSec)) } : {}) });
}
