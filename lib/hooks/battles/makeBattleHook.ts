import { useBattleAction } from "./useBattleAction";

import { type BattleOp, type BattleOpBody, type BattleOpResponse, battleOps, callBattleOp } from "@/lib/api/battle-ops";

export type BattleHookOptions = { onConflict?: () => void; onFailure?: (message: string) => void };

export function makeBattleHook<TBody extends object, TRes>(operation: BattleOp<TBody, TRes>) {
  return function useBattleOp(campaignId: string, battleId: string, options: BattleHookOptions = {}) {
    return useBattleAction<TBody, TRes>(campaignId, battleId, (data) => callBattleOp(operation, campaignId, battleId, data), {
      ...options,
      ...(operation.invalidate && { invalidate: operation.invalidate }),
      ...(operation.retryOnConflict && { retryOnConflict: true }),
    });
  };
}

export type BattleOpMutation<K extends keyof typeof battleOps> = ReturnType<
  typeof useBattleAction<BattleOpBody<(typeof battleOps)[K]>, BattleOpResponse<(typeof battleOps)[K]>>
>;
