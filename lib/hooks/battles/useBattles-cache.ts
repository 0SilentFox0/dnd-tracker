import type { useQueryClient } from "@tanstack/react-query";

import type { BattleScene } from "@/types/api";

/** Fallback-polling для активного бою. 30s — знижує egress; оновлення йдуть через Pusher та мутації. */
export const BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000;

/** Зберігає isDM та campaign з попереднього кешу, щоб панель DM не зникала після мутацій. Експортується для usePusherBattleSync. */
export function mergeBattleCache(
  queryClient: ReturnType<typeof useQueryClient>,
  campaignId: string,
  battleId: string,
  data: BattleScene,
): BattleScene {
  const previous = queryClient.getQueryData<BattleScene>([
    "battle",
    campaignId,
    battleId,
  ]);

  return {
    ...data,
    isDM: data.isDM ?? previous?.isDM,
    campaign: data.campaign ?? previous?.campaign,
    userRole: data.userRole ?? previous?.userRole,
  };
}
