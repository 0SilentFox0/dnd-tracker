import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  BATTLE_ACTIVE_REFETCH_INTERVAL_MS,
  mergeBattleCache,
} from "./useBattles-cache";

import type { AddParticipantData } from "@/lib/api/battles";
import {
  addBattleParticipant,
  attack,
  attackAndNextTurn,
  bonusAction,
  castSpell,
  completeBattle,
  deleteBattle,
  getBattle,
  moraleCheck,
  nextTurn,
  resetBattle,
  rollbackBattleAction,
  startBattle,
  updateBattle,
  updateBattleParticipant,
} from "@/lib/api/battles";
import type {
  AttackData,
  BattleScene,
  BonusActionData,
  MoraleCheckData,
  SpellCastData,
} from "@/types/api";

export { mergeBattleCache };

export function useBattle(
  campaignId: string,
  battleId: string,
  options?: {
    pauseRefetchWhen?: boolean;
    /** Вимкнути polling, коли Pusher підключено — оновлення йдуть по Realtime. */
    pauseRefetchWhenPusherConnected?: boolean;
  },
) {
  return useQuery<BattleScene>({
    queryKey: ["battle", campaignId, battleId],
    queryFn: () => getBattle(campaignId, battleId),
    staleTime: 15_000,
    refetchInterval: (query) => {
      if (options?.pauseRefetchWhen) return false;
      if (options?.pauseRefetchWhenPusherConnected) return false;

      const data = query.state.data as BattleScene | undefined;

      if (data?.status === "active") return BATTLE_ACTIVE_REFETCH_INTERVAL_MS;

      return false;
    },
  });
}

export function useUpdateBattle(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<BattleScene>) =>
      updateBattle(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(
          queryClient,
          campaignId,
          battleId,
          data as BattleScene,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useDeleteBattle(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (battleId: string) => deleteBattle(campaignId, battleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useNextTurn(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => nextTurn(campaignId, battleId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useAttack(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttackData) => attack(campaignId, battleId, data),
    onSuccess: (data) => {
      const merged = mergeBattleCache(
        queryClient,
        campaignId,
        battleId,
        data,
      );

      queryClient.setQueryData(["battle", campaignId, battleId], merged);
    },
  });
}

/** Attack and advance turn in one API call. */
export function useAttackAndNextTurn(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttackData) =>
      attackAndNextTurn(campaignId, battleId, data),
    onSuccess: (data) => {
      const merged = mergeBattleCache(
        queryClient,
        campaignId,
        battleId,
        data,
      );

      queryClient.setQueryData(["battle", campaignId, battleId], merged);
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useMoraleCheck(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MoraleCheckData) =>
      moraleCheck(campaignId, battleId, data),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, result.battle),
      );
    },
  });
}

export function useBonusAction(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BonusActionData) =>
      bonusAction(campaignId, battleId, data),
    onSuccess: (battle) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, battle),
      );
    },
  });
}

export function useCastSpell(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SpellCastData) => castSpell(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
    },
  });
}

export function useStartBattle(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startBattle(campaignId, battleId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["active-battles"] });
    },
  });
}

export function useResetBattle(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetBattle(campaignId, battleId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useCompleteBattle(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data?: { result?: "victory" | "defeat" }) =>
      completeBattle(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["active-battles"] });
    },
  });
}

export function useRollbackBattleAction(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionIndex: number) =>
      rollbackBattleAction(campaignId, battleId, actionIndex),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
      queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
    },
  });
}

export function useAddBattleParticipant(campaignId: string, battleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddParticipantData) =>
      addBattleParticipant(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
    },
  });
}

export function useUpdateBattleParticipant(
  campaignId: string,
  battleId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      participantId,
      data,
    }: {
      participantId: string;
      data: { currentHp?: number; removeFromBattle?: boolean };
    }) => updateBattleParticipant(campaignId, battleId, participantId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["battle", campaignId, battleId],
        mergeBattleCache(queryClient, campaignId, battleId, data),
      );
    },
  });
}
