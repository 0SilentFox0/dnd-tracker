import { MAX_WORLD_MAP_BYTES, WORLD_MAP_FORMATS, WORLD_MAP_UPLOAD_TYPES, WORLD_MAPS_BUCKET } from "@/lib/constants/world";
import { imageBucketStorage } from "@/lib/supabase/image-bucket-storage";
import type { WorldUploadRequest } from "@/types/world";

const worldMaps = imageBucketStorage({ bucket: WORLD_MAPS_BUCKET, maxBytes: MAX_WORLD_MAP_BYTES, formats: WORLD_MAP_FORMATS, bucketTypes: WORLD_MAP_UPLOAD_TYPES, logTag: "world-maps" });

export const createWorldMapUploadTicket = (campaignId: string, contentType: WorldUploadRequest["contentType"]) => worldMaps.createTicket(campaignId, contentType);
export const ownedWorldMapPath = worldMaps.ownedPath;
export const removeWorldMapFiles = worldMaps.remove;
