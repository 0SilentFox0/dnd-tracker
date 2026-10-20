import { useMutation, useQueryClient } from "@tanstack/react-query";

import { battleKeys } from "./keys";
import { battleQueryKey } from "./keys";

import { ApiError } from "@/lib/api/client";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleMutationResponse, BattleScene } from "@/types/api";

export interface BattleActionOptions {
  invalidate?: ("battles" | "active-battles")[];
  onConflict?: () => void;
  onFailure?: (message: string) => void;
  /** одна повторна спроба після 409 з версією з перечитаного кешу — лише для ідемпотентних дій */
  retryOnConflict?: boolean;
}

const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409;

export function useBattleAction<TVars extends object, TResp = Record<string, unknown>>(
  campaignId: string,
  battleId: string,
  fn: (vars: TVars & { expectedVersion?: number }) => Promise<BattleMutationResponse<TResp>>,
  options: BattleActionOptions = {},
) {
  const queryClient = useQueryClient();

  const key = battleQueryKey(campaignId, battleId);

  return useMutation({
    mutationFn: async (vars: TVars) => {
      const pinned = (vars as { expectedVersion?: number }).expectedVersion;

      const send = () => fn({ ...vars, expectedVersion: pinned ?? queryClient.getQueryData<BattleScene>(key)?.version });

      const { delta, response } = await send().catch(async (error: unknown) => {
        if (!options.retryOnConflict || pinned !== undefined || !isConflict(error)) throw error;

        await queryClient.invalidateQueries({ queryKey: key });

        return send();
      });

      const cached = queryClient.getQueryData<BattleScene>(key);

      const next = cached ? applyBattleDelta(cached, delta) : "refetch";

      if (next === "refetch") await queryClient.invalidateQueries({ queryKey: key });
      else queryClient.setQueryData(key, next);

      for (const list of options.invalidate ?? []) {
        void queryClient.invalidateQueries({ queryKey: list === "battles" ? battleKeys.list(campaignId) : battleKeys.active() });
      }

      return response;
    },
    onError: (error) => {
      if (isConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: key });
        options.onConflict?.();

        return;
      }

      options.onFailure?.(errorMessage(error, "Дію не виконано"));
    },
  });
}
