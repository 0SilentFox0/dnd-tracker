import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES, MAX_TRACKS_PER_CAMPAIGN, TRACK_TITLE_MAX } from "@/lib/constants/music";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

export const trackTitleSchema = z.string().trim().min(1).max(TRACK_TITLE_MAX);

export const trackUploadRequestSchema = z.object({
  name: z.string().max(255),
  size: z.number().int().positive().max(MAX_TRACK_BYTES),
  contentType: z.string().max(100),
});

const trackDurationSchema = z.number().int().positive().max(86_400);

const youtubeUrlSchema = z
  .string()
  .max(300)
  .refine((v) => parseYoutubeId(v) !== null, API_ERRORS.YOUTUBE_URL_INVALID);

export const createTrackSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), path: z.string().min(1).max(200), title: trackTitleSchema, durationSec: trackDurationSchema.optional() }),
  z.object({ kind: z.literal("youtube"), url: youtubeUrlSchema, title: trackTitleSchema.optional() }),
]);

export const updateTrackSchema = z
  .object({ title: trackTitleSchema.optional(), url: youtubeUrlSchema.optional(), durationSec: trackDurationSchema.nullable().optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Немає що змінювати");

export const reorderTracksSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_TRACKS_PER_CAMPAIGN) });

export const battleAudioCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("play"), trackId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("prev") }),
  z.object({ action: z.literal("stop") }),
]);
