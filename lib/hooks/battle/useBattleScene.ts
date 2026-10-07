"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { type BattleLogHistory, useBattleLogHistory } from "./useBattleLogHistory";
import { type BattleToastApi, useBattleToast } from "./useBattleToast";
import { type PusherConnectionState, usePusherBattleSync } from "./usePusherBattleSync";

import { BattleStatus,ParticipantSide } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import {
  battleQueryKey,
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
import { canSeeEnemyHp, type QueueEntry, type RetaliationOutcome, turnQueue, type Viewer } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export type ResultFx =
  | { kind: "hit" | "crit"; targetName: string; damage: number; downed: boolean; d20: number; weapon?: string; retaliation?: RetaliationOutcome }
  | { kind: "miss"; targetName: string; d20: number; known: string; retaliation?: RetaliationOutcome }
  | { kind: "morale-extra" | "morale-skip"; name: string; d10: number; morale: number };

export interface BattleLogState {
  open: boolean;
  focus: number | null;
}

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

/** Змінюється лише разом з даними бою — список учасників, черга, герой. */
export interface BattleSceneData {
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
  dmControlledId: string | null;
  setDmControlledId(id: string | null): void;
  select(id: string | null): void;
  readBattle(): BattleScene | undefined;
}

export interface BattleSceneValue extends BattleSceneData {
  connection: PusherConnectionState;
  selectedId: string | null;
  toast: BattleToastApi;
  result: ResultFx | null;
  showResult(fx: ResultFx | null): void;
  log: BattleLogState;
  openLog(focus?: number | null): void;
  closeLog(): void;
  logHistory: BattleLogHistory;
  actions: BattleSceneActions;
  anyPending: boolean;
}

export const BattleSceneContext = createContext<BattleSceneValue | null>(null);

export const BattleSceneDataContext = createContext<BattleSceneData | null>(null);

export function useBattleScene(): BattleSceneValue {
  const value = useContext(BattleSceneContext);

  if (!value) throw new Error("useBattleScene потребує BattleSceneProvider");

  return value;
}

/** Без тостів, журналу, вибору й стану мутацій: компонент не перемальовується, поки не змінився бій. */
export function useBattleSceneData(): BattleSceneData {
  const value = useContext(BattleSceneDataContext);

  if (!value) throw new Error("useBattleSceneData потребує BattleSceneProvider");

  return value;
}

export function useBattleSceneDataValue(value: BattleSceneValue): BattleSceneData {
  const { campaignId, battleId, battle, userId, isDM, viewer, current, myParticipants, hero, isMyTurn, queue, allies, enemies, dmControlledId, setDmControlledId, select, readBattle } = value;

  return useMemo(
    () => ({ campaignId, battleId, battle, userId, isDM, viewer, current, myParticipants, hero, isMyTurn, queue, allies, enemies, dmControlledId, setDmControlledId, select, readBattle }),
    [campaignId, battleId, battle, userId, isDM, viewer, current, myParticipants, hero, isMyTurn, queue, allies, enemies, dmControlledId, setDmControlledId, select, readBattle],
  );
}

function deriveScene(battle: BattleScene, userId: string | null, dmControlledId: string | null) {
  const isDM = battle.isDM === true;

  const turn = deriveTurn(battle, userId, isDM, dmControlledId);

  const order = battle.initiativeOrder ?? [];

  return {
    isDM,
    ...turn,
    viewer: { userId, isDM, canSeeEnemyHp: canSeeEnemyHp(turn.hero, order) },
    queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound),
    allies: order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY),
    enemies: order.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY),
  };
}

export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null) {
  const order = battle.initiativeOrder ?? [];

  const current = order[battle.currentTurnIndex] ?? null;

  const myParticipants = order.filter((p) => p.basicInfo.controlledBy === userId);

  const controls = (p: BattleParticipant) =>
    p.basicInfo.controlledBy === userId ||
    (isDM && (p.basicInfo.id === dmControlledId || p.basicInfo.controlledBy === CONTROLLED_BY_DM || p.basicInfo.side === ParticipantSide.ENEMY));

  const isMyTurn = battle.status === BattleStatus.ACTIVE && !!current && !!userId && controls(current);

  const dmHero = isDM && dmControlledId ? order.find((p) => p.basicInfo.id === dmControlledId) ?? null : null;

  const mine = new Set(myParticipants.map((p) => p.basicInfo.id));

  const nextMine = turnQueue(order, battle.currentTurnIndex, battle.currentRound ?? 1).find(
    (e): e is Extract<QueueEntry, { participant: BattleParticipant }> => e.kind !== "round" && !e.down && mine.has(e.participant.basicInfo.id),
  )?.participant;

  const hero = (isMyTurn ? current : null) ?? dmHero ?? nextMine ?? myParticipants[0] ?? (isDM ? current : null);

  return { current, isMyTurn, myParticipants, hero };
}

export function useBattleSceneValue(campaignId: string, battleId: string, userId: string | null) {
  const queryClient = useQueryClient();

  const toast = useBattleToast();

  const { show } = toast;

  const [dmControlledId, setDmControlledId] = useState<string | null>(null);

  const [selectedId, select] = useState<string | null>(null);

  const [result, showResult] = useState<ResultFx | null>(null);

  const [log, setLog] = useState<BattleLogState>({ open: false, focus: null });

  const openLog = useCallback((focus: number | null = null) => {
    select(null);
    setLog({ open: true, focus });
  }, []);

  const closeLog = useCallback(() => setLog({ open: false, focus: null }), []);

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

  const onFailure = useCallback((message: string) => show(message), [show]);

  const o = { onConflict, onFailure };

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
    () => queryClient.getQueryData<BattleScene>(battleQueryKey(campaignId, battleId)),
    [queryClient, campaignId, battleId],
  );

  const logHistory = useBattleLogHistory(campaignId, battleId, battle?.battleLog);

  const derived = useMemo(() => (battle ? deriveScene(battle, userId, dmControlledId) : null), [battle, userId, dmControlledId]);

  if (!battle || !derived) return { value: null, loading: isLoading };

  const value: BattleSceneValue = {
    campaignId,
    battleId,
    battle,
    userId,
    ...derived,
    connection: connectionState,
    dmControlledId,
    setDmControlledId,
    selectedId,
    select,
    toast,
    result,
    showResult,
    log,
    openLog,
    closeLog,
    readBattle,
    logHistory,
    actions,
    anyPending: Object.values(actions).some((m) => m.isPending),
  };

  return { value, loading: isLoading };
}
