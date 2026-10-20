import type { BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

export function mergeAudio(cached: BattleAudioState | null, incoming: BattleAudioState | null | undefined): BattleAudioState | null {
  if (!incoming) return cached;

  return !cached || incoming.seq > cached.seq ? incoming : cached;
}

/** Стан — лише за seq, годинник — лише з HTTP-відповіді; без змін повертає prev, щоб не будити спостерігачів. */
export function mergeAudioSnapshot(prev: BattleAudioSnapshot | undefined, incoming: { audio: BattleAudioState | null | undefined; clockOffsetMs?: number | null }): BattleAudioSnapshot {
  const audio = mergeAudio(prev?.audio ?? null, incoming.audio);

  const clockOffsetMs = incoming.clockOffsetMs ?? prev?.clockOffsetMs ?? null;

  return prev && audio === prev.audio && clockOffsetMs === prev.clockOffsetMs ? prev : { audio, clockOffsetMs };
}
