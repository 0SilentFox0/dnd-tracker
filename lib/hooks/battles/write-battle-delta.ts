import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { BattleRefetchSignal, BattleScene, ClientBattleDelta } from "@/types/api";

/** Патчить кешовану сцену дельтою; без кешу, refetch-сигнал чи пропуск версії — одна інвалідація. */
export function writeBattleDelta(
  queryClient: QueryClient,
  key: QueryKey,
  delta: ClientBattleDelta | BattleRefetchSignal,
): Promise<void> {
  const cached = queryClient.getQueryData<BattleScene>(key);

  const next = !cached || "refetch" in delta ? "refetch" : applyBattleDelta(cached, delta);

  if (next === "refetch") return queryClient.invalidateQueries({ queryKey: key });

  queryClient.setQueryData(key, next);

  return Promise.resolve();
}
