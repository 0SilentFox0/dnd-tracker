import { MAX_FX_BATCH } from "./timing";

import type { BattleAction } from "@/types/battle";

export function takeNewActions(log: BattleAction[], seen: number | null): { actions: BattleAction[]; seen: number } {
  const max = log.reduce((m, a) => Math.max(m, a.actionIndex), -1);

  if (seen === null || max <= seen) return { actions: [], seen: seen === null ? max : Math.min(seen, max) };

  const fresh = log.filter((a) => a.actionIndex > seen && !a.isCancelled).sort((a, b) => a.actionIndex - b.actionIndex);

  return { actions: fresh.slice(-MAX_FX_BATCH), seen: max };
}
