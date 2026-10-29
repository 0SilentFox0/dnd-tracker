import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { battleKeys, battleQueryKey } from "./keys";
import { makeBattleHook } from "./makeBattleHook";

import { battleOps } from "@/lib/api/battle-ops";
import type { CreateBattleData } from "@/lib/api/battles";
import { createBattle, deleteAllBattles, deleteBattle, getBattle, updateBattle } from "@/lib/api/battles";
import { BattleStatus } from "@/lib/constants/battle";
import { acceptFullBattle } from "@/lib/utils/battle/client/apply-delta";
import type { BattleScene } from "@/types/api";

/** Fallback-polling без Pusher. 30s — знижує egress; оновлення йдуть через Pusher та мутації. */
export const BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000;

// prepared теж: інакше гравці без Pusher не побачать старту бою.
const POLLED_BATTLE_STATUSES: ReadonlySet<BattleStatus> = new Set([
  BattleStatus.PREPARED,
  BattleStatus.ACTIVE,
]);

export function useBattle(
  campaignId: string,
  battleId: string,
  options?: {
    /** Вимкнути polling (напр. коли Pusher підключено — оновлення йдуть по Realtime). */
    pausePolling?: boolean;
  },
) {
  const queryClient = useQueryClient();

  return useQuery<BattleScene>({
    queryKey: battleQueryKey(campaignId, battleId),
    queryFn: async () =>
      acceptFullBattle(queryClient.getQueryData<BattleScene>(battleQueryKey(campaignId, battleId)), await getBattle(campaignId, battleId)),
    staleTime: 15_000,
    refetchInterval: (query) => {
      if (options?.pausePolling) return false;

      const data = query.state.data as BattleScene | undefined;

      if (data && POLLED_BATTLE_STATUSES.has(data.status)) return BATTLE_ACTIVE_REFETCH_INTERVAL_MS;

      return false;
    },
  });
}

export function useUpdateBattle(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  const key = battleQueryKey(campaignId, battleId);

  return useMutation({
    mutationFn: (data: Partial<BattleScene>) => updateBattle(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(key, acceptFullBattle(queryClient.getQueryData<BattleScene>(key), data));
      void queryClient.invalidateQueries({ queryKey: battleKeys.list(campaignId) });
    },
  });
}

export function useDeleteBattle(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (battleId: string) => deleteBattle(campaignId, battleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: battleKeys.list(campaignId) });
    },
  });
}

export function useCreateBattle(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBattleData) => createBattle(campaignId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: battleKeys.list(campaignId) }),
  });
}

export function useDeleteAllBattles(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllBattles(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: battleKeys.list(campaignId) });
      router.refresh();
    },
  });
}

export const useNextTurn = makeBattleHook(battleOps.nextTurn);
export const useAttack = makeBattleHook(battleOps.attack);
export const useMoraleCheck = makeBattleHook(battleOps.moraleCheck);
export const useCritChoice = makeBattleHook(battleOps.critChoice);
export const useAbilityAction = makeBattleHook(battleOps.abilityAction);
export const useAuraZone = makeBattleHook(battleOps.auraZone);
export const useMoveParticipant = makeBattleHook(battleOps.move);
export const useMapTerrain = makeBattleHook(battleOps.mapTerrain);
export const useMazeAction = makeBattleHook(battleOps.maze);
export const useMazeMark = makeBattleHook(battleOps.mazeMark);
export const useMapWeather = makeBattleHook(battleOps.mapWeather);
export const useBonusAction = makeBattleHook(battleOps.bonusAction);
export const useCastSpell = makeBattleHook(battleOps.castSpell);
export const useStartBattle = makeBattleHook(battleOps.start);
export const useResetBattle = makeBattleHook(battleOps.reset);
export const useCompleteBattle = makeBattleHook(battleOps.complete);
export const useRollbackBattleAction = makeBattleHook(battleOps.rollback);
export const useRevealBattleParticipants = makeBattleHook(battleOps.reveal);
export const useBattleConditions = makeBattleHook(battleOps.conditions);
export const useBattleCoreAction = makeBattleHook(battleOps.coreAction);
export const useAddBattleParticipant = makeBattleHook(battleOps.addParticipant);
export const useUpdateBattleParticipant = makeBattleHook(battleOps.updateParticipant);
export const useScaleBattleUnits = makeBattleHook(battleOps.scaleUnits);
export const useUnitControl = makeBattleHook(battleOps.unitControl);
export const useRefreshBattleSources = makeBattleHook(battleOps.refreshSources);
