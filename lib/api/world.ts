import { campaignDelete, campaignGet, campaignPatch, campaignPost } from "./client";

import { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";
import { createClient } from "@/lib/supabase/client";
import type { SlideUploadTicket } from "@/types/show";
import type {
  CreateWorldMapData,
  CreateWorldMarkerData,
  UpdateWorldMapData,
  UpdateWorldMarkerData,
  WorldMap,
  WorldMapDetail,
  WorldMapSummary,
  WorldMarker,
  WorldUploadRequest,
} from "@/types/world";

export const getWorldMaps = (campaignId: string) => campaignGet<WorldMapSummary[]>(campaignId, "/world/maps", { cache: "no-store" });

export const getWorldMap = (campaignId: string, mapId: string) => campaignGet<WorldMapDetail>(campaignId, `/world/maps/${mapId}`, { cache: "no-store" });

export const createWorldMap = (campaignId: string, data: CreateWorldMapData) => campaignPost<WorldMap>(campaignId, "/world/maps", data);

export const updateWorldMap = (campaignId: string, mapId: string, data: UpdateWorldMapData) => campaignPatch<WorldMap>(campaignId, `/world/maps/${mapId}`, data);

export const deleteWorldMap = (campaignId: string, mapId: string) => campaignDelete<{ ok: true }>(campaignId, `/world/maps/${mapId}`);

export const createWorldMarker = (campaignId: string, data: CreateWorldMarkerData) => campaignPost<WorldMarker>(campaignId, "/world/markers", data);

export const updateWorldMarker = (campaignId: string, markerId: string, data: UpdateWorldMarkerData) =>
  campaignPatch<WorldMarker>(campaignId, `/world/markers/${markerId}`, data);

export const deleteWorldMarker = (campaignId: string, markerId: string) => campaignDelete<{ ok: true }>(campaignId, `/world/markers/${markerId}`);

/** Файл іде з браузера прямо в Storage: тіло запиту до Vercel обмежене 4,5 МБ. */
export async function uploadWorldMapImage(campaignId: string, blob: Blob): Promise<string> {
  const request: WorldUploadRequest = { size: blob.size, contentType: blob.type as WorldUploadRequest["contentType"] };

  const ticket = await campaignPost<SlideUploadTicket>(campaignId, "/world/upload-url", request);

  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: ticket.contentType, cacheControl: YEAR_CACHE_SECONDS });

  if (error) throw new Error(`Не вдалося завантажити картинку: ${error.message}`);

  return ticket.publicUrl;
}
