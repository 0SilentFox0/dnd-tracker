export type TrackKind = 'file' | 'youtube';

export interface CampaignTrack {
    id: string;
    title: string;
    kind: TrackKind;
    url: string | null;
    youtubeId: string | null;
    durationSec: number | null;
    sortOrder: number;
    createdAt: string;
}

export type BattleAudioTrack = Pick<
    CampaignTrack,
    'title' | 'kind' | 'url' | 'youtubeId' | 'durationSec'
>;

export interface BattleAudioState {
    trackId: string | null;
    track: BattleAudioTrack | null;
    playing: boolean;
    offsetSec: number;
    startedAt: number;
    seq: number;
}

export type BattleAudioCommand =
    | { action: 'play'; trackId: string }
    | { action: 'pause' }
    | { action: 'resume' }
    | { action: 'seek'; offsetSec: number }
    | { action: 'next' }
    | { action: 'prev' }
    | { action: 'stop' };

export interface BattleAudioResponse {
    audio: BattleAudioState | null;
}

export interface BattleAudioEvent {
    battleId: string;
    audio: BattleAudioState;
}

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
    | { kind: 'file'; path: string; title: string; durationSec?: number }
    | { kind: 'youtube'; url: string; title?: string };

export interface UpdateTrackData {
    title?: string;
    url?: string;
    durationSec?: number | null;
}
