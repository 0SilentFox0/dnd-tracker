import type { QueryClient } from "@tanstack/react-query";

import { battleKeys } from "@/lib/hooks/battles";
import { mergeAudioSnapshot } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot } from "@/types/audio";

export function writeAudioSnapshot(queryClient: QueryClient, ids: { campaignId: string; battleId: string }, incoming: Parameters<typeof mergeAudioSnapshot>[1]): void {
  queryClient.setQueryData<BattleAudioSnapshot>(battleKeys.audio(ids.campaignId, ids.battleId), (prev) => mergeAudioSnapshot(prev, incoming));
}
