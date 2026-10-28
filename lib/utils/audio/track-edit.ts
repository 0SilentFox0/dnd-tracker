import { joinTrackTitle, splitTrackTitle } from "./playlist-groups";
import { trackLink } from "./track-link";
import { parseYoutubeId } from "./youtube-id";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { TRACK_TITLE_MAX } from "@/lib/constants/music";
import type { CampaignTrack, UpdateTrackData } from "@/types/audio";

export interface TrackDraft {
  group: string;
  name: string;
  url: string;
  durationSec: string;
}

type TrackDraftError = { title?: string; url?: string; durationSec?: string };

export type TrackPatchResult = { ok: true; patch: UpdateTrackData } | { ok: false; error: TrackDraftError };

export function trackToDraft(track: CampaignTrack): TrackDraft {
  return { ...splitTrackTitle(track.title), url: trackLink(track) ?? "", durationSec: track.durationSec ? String(track.durationSec) : "" };
}

/** Лише змінені поля; назва = «група - назва»; порожня чи задовга назва чи некоректні посилання/тривалість — помилка */
export function buildTrackPatch(track: CampaignTrack, draft: TrackDraft): TrackPatchResult {
  const patch: UpdateTrackData = {};

  const error: TrackDraftError = {};

  const title = joinTrackTitle(draft.group, draft.name);

  if (title.length > TRACK_TITLE_MAX) error.title = API_ERRORS.TRACK_TITLE_TOO_LONG;
  else if (title && title !== track.title) patch.title = title;

  if (track.kind === "youtube" && draft.url.trim() !== (trackLink(track) ?? "")) {
    const id = parseYoutubeId(draft.url);

    if (!id) error.url = API_ERRORS.YOUTUBE_URL_INVALID;
    else if (id !== track.youtubeId) patch.url = draft.url.trim();
  }

  const raw = draft.durationSec.trim();

  if (raw !== (track.durationSec ? String(track.durationSec) : "")) {
    const sec = Number(raw);

    if (raw && !(Number.isInteger(sec) && sec > 0 && sec <= 86_400)) error.durationSec = API_ERRORS.TRACK_DURATION_INVALID;
    else patch.durationSec = raw ? sec : null;
  }

  if (!title) return { ok: false, error };

  return Object.keys(error).length > 0 ? { ok: false, error } : { ok: true, patch };
}
