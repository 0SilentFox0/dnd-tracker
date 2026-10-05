import type { useQueryClient } from "@tanstack/react-query";

import type { BattleScene } from "@/types/api";

/** Fallback-polling для активного бою. 30s — знижує egress; оновлення йдуть через Pusher та мутації. */
export const BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000;

/**
 * Зливає відповідь/подію бою з кешем: зберігає isDM/campaign/userRole, ігнорує старіші версії
 * (ехо Pusher після відповіді наступної дії) і доклеює журнал у режимі append.
 */
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

  if (previous && data.version !== undefined && previous.version !== undefined && data.version <= previous.version) {
    return previous;
  }

  return {
    ...data,
    battleLog: mergeLog(previous, data),
    isDM: data.isDM ?? previous?.isDM,
    campaign: data.campaign ?? previous?.campaign,
    userRole: data.userRole ?? previous?.userRole,
  };
}

function mergeLog(previous: BattleScene | undefined, data: BattleScene): BattleScene["battleLog"] {
  const incoming = data.battleLog ?? [];

  if (data.battleLogMode !== "append") return incoming;

  const cancelledFrom = data.battleLogCancelledFrom;

  const incomingIds = new Set(incoming.map((e) => e.actionIndex));

  const kept = (previous?.battleLog ?? []).filter(
    (e) => !incomingIds.has(e.actionIndex) && (cancelledFrom === undefined || e.actionIndex < cancelledFrom),
  );

  return [...kept, ...incoming];
}
