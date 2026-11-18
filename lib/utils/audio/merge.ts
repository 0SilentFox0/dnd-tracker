import type { BattleAudioSnapshot, BattleAudioState } from '@/types/audio';

export function mergeAudio(
    cached: BattleAudioState | null,
    incoming: BattleAudioState | null | undefined
): BattleAudioState | null {
    if (!incoming) return cached;

    return !cached || incoming.seq > cached.seq ? incoming : cached;
}

export type AudioIncoming = {
    audio: BattleAudioState | null | undefined;
    clockOffsetMs?: number | null;
};

export function mergeAudioSnapshot(
    prev: BattleAudioSnapshot | undefined,
    incoming: AudioIncoming
): BattleAudioSnapshot {
    const audio = mergeAudio(prev?.audio ?? null, incoming.audio);

    const clockOffsetMs = incoming.clockOffsetMs ?? prev?.clockOffsetMs ?? null;

    return prev && audio === prev.audio && clockOffsetMs === prev.clockOffsetMs
        ? prev
        : { audio, clockOffsetMs };
}
