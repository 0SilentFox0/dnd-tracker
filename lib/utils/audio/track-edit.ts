import { trackLink } from "./track-link";
import { parseYoutubeId } from "./youtube-id";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { CampaignTrack, UpdateTrackData } from "@/types/audio";

export interface TrackDraft {
  title: string;
  url: string;
  durationSec: string;
}

export type TrackPatchResult = { ok: true; patch: UpdateTrackData } | { ok: false; error: { url?: string; durationSec?: string } };

export function trackToDraft(track: CampaignTrack): TrackDraft {
  return { title: track.title, url: trackLink(track) ?? "", durationSec: track.durationSec ? String(track.durationSec) : "" };
}

/** Лише змінені поля; порожня назва чи некоректні посилання/тривалість — помилка */
export function buildTrackPatch(track: CampaignTrack, draft: TrackDraft): TrackPatchResult {
  const patch: UpdateTrackData = {};

  const error: { url?: string; durationSec?: string } = {};

  const title = draft.title.trim();

  if (title && title !== track.title) patch.title = title;

  if (track.kind === "youtube" && draft.url.trim() !== (trackLink(track) ?? "")) {
    const id = parseYoutubeId(draft.url);

    if (!id) error.url = API_ERRORS.YOUTUBE_URL_INVALID;
    else if (id !== track.youtubeId) patch.url = draft.url.trim();
  }

  const raw = draft.durationSec.trim();

  if (raw !== (track.durationSec ? String(track.durationSec) : "")) {
    const sec = Number(raw);

    if (raw && !(Number.isInteger(sec) && sec > 0 && sec <= 86_400)) error.durationSec = "Ціле число секунд від 1 до 86400";
    else patch.durationSec = raw ? sec : null;
  }

  if (!title) return { ok: false, error };

  return Object.keys(error).length > 0 ? { ok: false, error } : { ok: true, patch };
}
