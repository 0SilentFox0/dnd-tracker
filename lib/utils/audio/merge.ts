import type { BattleAudioState } from "@/types/audio";

export function mergeAudio(cached: BattleAudioState | null, incoming: BattleAudioState | null | undefined): BattleAudioState | null {
  if (!incoming) return cached;

  return !cached || incoming.seq > cached.seq ? incoming : cached;
}
