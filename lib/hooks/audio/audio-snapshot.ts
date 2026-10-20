import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

export function writeAudioSnapshot(queryClient: QueryClient, queryKey: QueryKey, incoming: Parameters<typeof mergeAudioSnapshot>[1]): void {
  queryClient.setQueryData<BattleAudioSnapshot>(queryKey, (prev) => mergeAudioSnapshot(prev, incoming));
}
