/**
 * Термінологія: «music» — бібліотека кампанії й треки (CRUD: lib/hooks/music, components/music, dm/music);
 * «audio» — стан відтворення в бою (BattleAudio*, lib/utils/audio, components/battle/audio).
 */
export type TrackKind = "file" | "youtube";

export interface CampaignTrack {
  id: string;
  title: string;
  kind: TrackKind;
  /** публічний URL у бакеті battle-music (лише file) */
  url: string | null;
  youtubeId: string | null;
  durationSec: number | null;
  sortOrder: number;
  createdAt: string;
}

/** Знімок треку в стані бою: гравцям не потрібна бібліотека, видалення треку не ламає стан */
export type BattleAudioTrack = Pick<CampaignTrack, "title" | "kind" | "url" | "youtubeId" | "durationSec">;

export interface BattleAudioState {
  /** null — «Стоп» */
  trackId: string | null;
  track: BattleAudioTrack | null;
  playing: boolean;
  offsetSec: number;
  /** мс годинника сервера, коли почалося відтворення з offsetSec */
  startedAt: number;
  seq: number;
}

export type BattleAudioCommand =
  | { action: "play"; trackId: string }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "next" }
  | { action: "prev" }
  | { action: "stop" };

export interface BattleAudioResponse {
  audio: BattleAudioState | null;
}

/** Pusher `battle-audio` */
export interface BattleAudioEvent {
  battleId: string;
  audio: BattleAudioState;
}

/** Кеш клієнта: стан і зсув годинника сервера відносно локального */
export interface BattleAudioSnapshot {
  audio: BattleAudioState | null;
  clockOffsetMs: number | null;
}

export interface TrackUploadRequest {
  name: string;
  size: number;
  contentType: string;
}

export interface TrackUploadTicket {
  bucket: string;
  path: string;
  token: string;
  contentType: string;
}

export type CreateTrackData =
  | { kind: "file"; path: string; title: string; durationSec?: number }
  | { kind: "youtube"; url: string; title?: string };

/** url — лише YouTube-трек; durationSec: null очищає тривалість */
export interface UpdateTrackData {
  title?: string;
  url?: string;
  durationSec?: number | null;
}
