import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useBattleAction } from "./useBattleAction";

import type { AddParticipantData, CreateBattleData } from "@/lib/api/battles";
import {
  addBattleParticipant,
  attack,
  bonusAction,
  castSpell,
  completeBattle,
  createBattle,
  deleteAllBattles,
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
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import { acceptFullBattle } from "@/lib/utils/battle/client/apply-delta";
import type {
  AttackData,
  BattleScene,
  BonusActionData,
  MoraleCheckData,
  SpellCastData,
} from "@/types/api";

/** Fallback-polling для активного бою. 30s — знижує egress; оновлення йдуть через Pusher та мутації. */
export const BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000;

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

  const key = ["battle", campaignId, battleId];

  return useMutation({
    mutationFn: (data: Partial<BattleScene>) => updateBattle(campaignId, battleId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(key, acceptFullBattle(queryClient.getQueryData<BattleScene>(key), data));
      void queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
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

export function useCreateBattle(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBattleData) => createBattle(campaignId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["battles", campaignId] }),
  });
}

export function useDeleteAllBattles(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllBattles(campaignId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["battles", campaignId] });
      router.refresh();
    },
  });
}

type ActionOpts = { onConflict?: () => void; onFailure?: (message: string) => void };

export const useNextTurn = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => nextTurn(c, b, body), { ...o, invalidate: ["battles"] });

export const useAttack = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AttackData & { endTurn?: boolean }>(c, b, (data) => attack(c, b, data), { ...o, invalidate: ["battles"] });

export const useMoraleCheck = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MoraleCheckData, { moraleResult: MoraleCheckResult }>(c, b, (data) => moraleCheck(c, b, data), o);

export const useBonusAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<BonusActionData>(c, b, (data) => bonusAction(c, b, data), o);

export const useCastSpell = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<SpellCastData>(c, b, (data) => castSpell(c, b, data), o);

export const useStartBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => startBattle(c, b, body), { ...o, invalidate: ["battles", "active-battles"] });

export const useResetBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => resetBattle(c, b, body), { ...o, invalidate: ["battles"] });

export const useCompleteBattle = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ result?: "victory" | "defeat" }>(c, b, (body) => completeBattle(c, b, body), {
    ...o,
    invalidate: ["battles", "active-battles"],
  });

export const useRollbackBattleAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ actionIndex: number }>(c, b, (body) => rollbackBattleAction(c, b, body), { ...o, invalidate: ["battles"] });

export const useAddBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AddParticipantData>(c, b, (data) => addBattleParticipant(c, b, data), o);

export const useUpdateBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ participantId: string; data: { currentHp?: number; removeFromBattle?: boolean } }>(
    c,
    b,
    ({ participantId, data, expectedVersion }) => updateBattleParticipant(c, b, participantId, { ...data, expectedVersion }),
    o,
  );
