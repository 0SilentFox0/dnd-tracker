import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { type AudioIncoming, mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

export function writeAudioSnapshot(queryClient: QueryClient, queryKey: QueryKey, incoming: AudioIncoming): void {
  queryClient.setQueryData<BattleAudioSnapshot>(queryKey, (prev) => mergeAudioSnapshot(prev, incoming));
}
