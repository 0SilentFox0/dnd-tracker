"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { type BattleToastApi, useBattleToast } from "./useBattleToast";
import { type PusherConnectionState, usePusherBattleSync } from "./usePusherBattleSync";

import { ParticipantSide } from "@/lib/constants/battle";
import {
  useAddBattleParticipant,
  useAttack,
  useBattle,
  useBonusAction,
  useCastSpell,
  useCompleteBattle,
  useMoraleCheck,
  useNextTurn,
  useResetBattle,
  useRollbackBattleAction,
  useStartBattle,
  useUpdateBattleParticipant,
} from "@/lib/hooks/battles";
import { type QueueEntry, turnQueue, type Viewer } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export type ResultFx =
  | { kind: "hit" | "crit"; targetName: string; damage: number; downed: boolean; d20: number; weapon?: string }
  | { kind: "miss"; targetName: string; d20: number; known: string }
  | { kind: "morale-extra" | "morale-skip"; name: string; d10: number; morale: number };

export interface BattleSceneActions {
  nextTurn: ReturnType<typeof useNextTurn>;
  attack: ReturnType<typeof useAttack>;
  moraleCheck: ReturnType<typeof useMoraleCheck>;
  bonusAction: ReturnType<typeof useBonusAction>;
  castSpell: ReturnType<typeof useCastSpell>;
  start: ReturnType<typeof useStartBattle>;
  reset: ReturnType<typeof useResetBattle>;
  complete: ReturnType<typeof useCompleteBattle>;
  rollback: ReturnType<typeof useRollbackBattleAction>;
  addParticipant: ReturnType<typeof useAddBattleParticipant>;
  updateParticipant: ReturnType<typeof useUpdateBattleParticipant>;
}

export interface BattleSceneValue {
  campaignId: string;
  battleId: string;
  battle: BattleScene;
  userId: string | null;
  isDM: boolean;
  viewer: Viewer;
  current: BattleParticipant | null;
  myParticipants: BattleParticipant[];
  hero: BattleParticipant | null;
  isMyTurn: boolean;
  queue: QueueEntry[];
  allies: BattleParticipant[];
  enemies: BattleParticipant[];
  connection: PusherConnectionState;
  dmControlledId: string | null;
  setDmControlledId(id: string | null): void;
  selectedId: string | null;
  select(id: string | null): void;
  toast: BattleToastApi;
  result: ResultFx | null;
  showResult(fx: ResultFx | null): void;
  readBattle(): BattleScene | undefined;
  actions: BattleSceneActions;
  anyPending: boolean;
}

export const BattleSceneContext = createContext<BattleSceneValue | null>(null);

export function useBattleScene(): BattleSceneValue {
  const value = useContext(BattleSceneContext);

  if (!value) throw new Error("useBattleScene потребує BattleSceneProvider");

  return value;
}

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null) {
  const order = battle.initiativeOrder ?? [];

  const current = order[battle.currentTurnIndex] ?? null;

  const myParticipants = order.filter((p) => p.basicInfo.controlledBy === userId);

  const controls = (p: BattleParticipant) =>
    p.basicInfo.controlledBy === userId ||
    (isDM && (p.basicInfo.id === dmControlledId || p.basicInfo.controlledBy === "dm" || p.basicInfo.side === ParticipantSide.ENEMY));

  const isMyTurn = !!current && !!userId && controls(current);

  const dmHero = isDM && dmControlledId ? order.find((p) => p.basicInfo.id === dmControlledId) ?? null : null;

  const hero = (isMyTurn ? current : null) ?? dmHero ?? myParticipants.find(isUp) ?? myParticipants[0] ?? null;

  return { current, isMyTurn, myParticipants, hero };
}

function canSeeEnemyHpOf(hero: BattleParticipant | null): boolean {
  return (hero?.battleData.resolvedAbilities ?? []).some(
    (a) => /enemy hp|detect/i.test(a.name) || a.effects.some((e) => e.kind === "flag" && e.flag === "seeEnemyHp"),
  );
}

export function useBattleSceneValue(campaignId: string, battleId: string, userId: string | null) {
  const queryClient = useQueryClient();

  const toast = useBattleToast();

  const { show } = toast;

  const [dmControlledId, setDmControlledId] = useState<string | null>(null);

  const [selectedId, select] = useState<string | null>(null);

  const [result, showResult] = useState<ResultFx | null>(null);

  const onTurnStarted = useCallback(
    (message: string) => {
      show(message);
      document.title = "⚔ Твій хід";
      navigator.vibrate?.(200);
    },
    [show],
  );

  const { connectionState } = usePusherBattleSync(campaignId, battleId, userId, onTurnStarted);

  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pauseRefetchWhenPusherConnected: connectionState === "connected" });

  const onConflict = useCallback(() => show("Стан бою змінився, повторіть дію"), [show]);

  const o = { onConflict };

  const actions: BattleSceneActions = {
    nextTurn: useNextTurn(campaignId, battleId, o),
    attack: useAttack(campaignId, battleId, o),
    moraleCheck: useMoraleCheck(campaignId, battleId, o),
    bonusAction: useBonusAction(campaignId, battleId, o),
    castSpell: useCastSpell(campaignId, battleId, o),
    start: useStartBattle(campaignId, battleId, o),
    reset: useResetBattle(campaignId, battleId, o),
    complete: useCompleteBattle(campaignId, battleId, o),
    rollback: useRollbackBattleAction(campaignId, battleId, o),
    addParticipant: useAddBattleParticipant(campaignId, battleId, o),
    updateParticipant: useUpdateBattleParticipant(campaignId, battleId, o),
  };

  const readBattle = useCallback(
    () => queryClient.getQueryData<BattleScene>(["battle", campaignId, battleId]),
    [queryClient, campaignId, battleId],
  );

  if (!battle) return { value: null, loading: isLoading };

  const isDM = battle.isDM === true;

  const turn = deriveTurn(battle, userId, isDM, dmControlledId);

  const order = battle.initiativeOrder ?? [];

  const value: BattleSceneValue = {
    campaignId,
    battleId,
    battle,
    userId,
    isDM,
    viewer: { userId, isDM, canSeeEnemyHp: canSeeEnemyHpOf(turn.hero) },
    ...turn,
    queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound),
    allies: order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY),
    enemies: order.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY),
    connection: connectionState,
    dmControlledId,
    setDmControlledId,
    selectedId,
    select,
    toast,
    result,
    showResult,
    readBattle,
    actions,
    anyPending: Object.values(actions).some((m) => m.isPending),
  };

  return { value, loading: isLoading };
}
