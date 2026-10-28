import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { battleKeys } from "./keys";
import { battleQueryKey } from "./keys";
import { useBattleAction } from "./useBattleAction";

import type { AddParticipantData, BattleConditionsBody, CoreActionBody, CreateBattleData, UnitControlData } from "@/lib/api/battles";
import {
  abilityAction,
  addBattleParticipant,
  applyBattleCondition,
  attack,
  bonusAction,
  castSpell,
  completeBattle,
  createBattle,
  deleteAllBattles,
  deleteBattle,
  getBattle,
  mazeAction,
  mazeMark,
  moraleCheck,
  moveParticipant,
  nextTurn,
  refreshBattleSources,
  resetBattle,
  revealBattleParticipants,
  rollbackBattleAction,
  runCoreAction,
  scaleBattleUnits,
  setAuraZone,
  setBattleUnitControl,
  setMapTerrain,
  setMapWeather,
  startBattle,
  updateBattle,
  updateBattleParticipant,
} from "@/lib/api/battles";
import { BattleStatus } from "@/lib/constants/battle";
import { acceptFullBattle } from "@/lib/utils/battle/client/apply-delta";
import type { MoraleCheckResult } from "@/lib/utils/battle/morale/check";
import type {
  AbilityActionData,
  AttackData,
  AuraZoneData,
  BattleMutationResponse,
  BattleScene,
  BonusActionData,
  MapTerrainData,
  MapTerrainResponse,
  MapWeatherData,
  MazeActionData,
  MazeMarkData,
  MoraleCheckData,
  MoveParticipantData,
  SpellCastData,
} from "@/types/api";
import type { BattleAction } from "@/types/battle";

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
    pauseRefetchWhen?: boolean;
    /** Вимкнути polling, коли Pusher підключено — оновлення йдуть по Realtime. */
    pauseRefetchWhenPusherConnected?: boolean;
  },
) {
  const queryClient = useQueryClient();

  return useQuery<BattleScene>({
    queryKey: battleQueryKey(campaignId, battleId),
    queryFn: async () =>
      acceptFullBattle(queryClient.getQueryData<BattleScene>(battleQueryKey(campaignId, battleId)), await getBattle(campaignId, battleId)),
    staleTime: 15_000,
    refetchInterval: (query) => {
      if (options?.pauseRefetchWhen) return false;

      if (options?.pauseRefetchWhenPusherConnected) return false;

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

type ActionOpts = { onConflict?: () => void; onFailure?: (message: string) => void };

export const useNextTurn = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<object>(c, b, (body) => nextTurn(c, b, body), { ...o, invalidate: ["battles"] });

export interface AttackResponse {
  hpChanges: BattleAction["hpChanges"];
}

const withHpChanges = (res: BattleMutationResponse) => ({ ...res, response: { hpChanges: res.delta.log.flatMap((a) => a.hpChanges ?? []) } });

export const useAttack = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AttackData & { endTurn?: boolean }, AttackResponse>(c, b, async (data) => withHpChanges(await attack(c, b, data)), { ...o, invalidate: ["battles"] });

export const useMoraleCheck = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MoraleCheckData, { moraleResult: MoraleCheckResult }>(c, b, (data) => moraleCheck(c, b, data), o);

export const useAbilityAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AbilityActionData>(c, b, (data) => abilityAction(c, b, data), o);

export const useAuraZone = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AuraZoneData>(c, b, (data) => setAuraZone(c, b, data), o);

export const useMoveParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MoveParticipantData>(c, b, (data) => moveParticipant(c, b, data), o);

export const useMapTerrain = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MapTerrainData, MapTerrainResponse>(c, b, (data) => setMapTerrain(c, b, data), { ...o, retryOnConflict: true });

export const useMazeAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MazeActionData>(c, b, (data) => mazeAction(c, b, data), o);

export const useMazeMark = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MazeMarkData>(c, b, (data) => mazeMark(c, b, data), o);

export const useMapWeather = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MapWeatherData>(c, b, (data) => setMapWeather(c, b, data), { ...o, retryOnConflict: true });

export const useBonusAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<BonusActionData>(c, b, (data) => bonusAction(c, b, data), o);

export const useCastSpell = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<SpellCastData, AttackResponse>(c, b, async (data) => withHpChanges(await castSpell(c, b, data)), o);

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

export const useRevealBattleParticipants = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ participantIds: string[] }>(c, b, (body) => revealBattleParticipants(c, b, body), o);

export const useBattleConditions = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<BattleConditionsBody>(c, b, (body) => applyBattleCondition(c, b, body), o);

export const useBattleCoreAction = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<CoreActionBody>(c, b, (body) => runCoreAction(c, b, body), o);

export const useAddBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<AddParticipantData>(c, b, (data) => addBattleParticipant(c, b, data), o);

export const useUpdateBattleParticipant = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ participantId: string; data: { lairActive?: boolean; currentHp?: number; removeFromBattle?: boolean; kill?: boolean; revive?: boolean } }>(
    c,
    b,
    ({ participantId, data, expectedVersion }) => updateBattleParticipant(c, b, participantId, { ...data, expectedVersion }),
    o,
  );

export const useScaleBattleUnits = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<{ direction: "buff" | "debuff" }>(c, b, (body) => scaleBattleUnits(c, b, body), o);

export const useUnitControl = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<UnitControlData>(c, b, (body) => setBattleUnitControl(c, b, body), o);

export const useRefreshBattleSources = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<Record<string, never>>(c, b, (body) => refreshBattleSources(c, b, body), o);
