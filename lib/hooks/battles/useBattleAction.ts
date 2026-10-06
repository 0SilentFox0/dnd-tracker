import { useMutation, useQueryClient } from "@tanstack/react-query";

import { battleQueryKey } from "./keys";

import { ApiError } from "@/lib/api/client";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { BattleMutationResponse, BattleScene } from "@/types/api";

export interface BattleActionOptions {
  invalidate?: ("battles" | "active-battles")[];
  onConflict?: () => void;
  onFailure?: (message: string) => void;
}

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

      const expectedVersion = pinned ?? queryClient.getQueryData<BattleScene>(key)?.version;

      const { delta, response } = await fn({ ...vars, expectedVersion });

      const cached = queryClient.getQueryData<BattleScene>(key);

      const next = cached ? applyBattleDelta(cached, delta) : "refetch";

      if (next === "refetch") await queryClient.invalidateQueries({ queryKey: key });
      else queryClient.setQueryData(key, next);

      for (const list of options.invalidate ?? []) {
        void queryClient.invalidateQueries({ queryKey: list === "battles" ? ["battles", campaignId] : ["active-battles"] });
      }

      return response;
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: key });
        options.onConflict?.();

        return;
      }

      options.onFailure?.(error instanceof Error && error.message ? error.message : "Дію не виконано");
    },
  });
}
