"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { type BattleLogHistory, useBattleLogHistory } from "./useBattleLogHistory";
import { type BattleToastApi, useBattleToast } from "./useBattleToast";
import { useDisplayEffectMap } from "./useDisplayEffectMap";
import { useParticipantClick } from "./useParticipantClick";
import { type PusherConnectionState, usePusherBattleSync } from "./usePusherBattleSync";

import { BattleStatus,ParticipantSide } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import {
  battleQueryKey,
  useAbilityAction,
  useAddBattleParticipant,
  useAttack,
  useAuraZone,
  useBattle,
  useBonusAction,
  useCastSpell,
  useCompleteBattle,
  useMapTerrain,
  useMazeAction,
  useMazeMark,
  useMoraleCheck,
  useMoveParticipant,
  useNextTurn,
  useRefreshBattleSources,
  useResetBattle,
  useRevealBattleParticipants,
  useRollbackBattleAction,
  useScaleBattleUnits,
  useStartBattle,
  useUnitControl,
  useUpdateBattleParticipant,
} from "@/lib/hooks/battles";
import { type AttackIntent, isIntentStale } from "@/lib/utils/battle/flows";
import type { MapAim } from "@/lib/utils/battle/grid";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import { canSeeEnemyHp, type CritEffectFx, type ParticipantFace, type QueueEntry, type RetaliationOutcome, turnQueue, type Viewer } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export type { CritEffectFx, ParticipantFace };

const NO_ORDER: BattleParticipant[] = [];

/** Удар по одній цілі багатоцільової атаки */
export interface StrikeFx {
  targetName: string;
  kind: "hit" | "crit" | "miss";
  damage: number;
  downed: boolean;
}

export type ResultFx =
  | { kind: "hit" | "crit"; targetName: string; damage: number; downed: boolean; d20: number; weapon?: string; retaliation?: RetaliationOutcome; critEffect?: CritEffectFx; strikes?: StrikeFx[] }
  | { kind: "miss"; targetName: string; d20: number; known: string; retaliation?: RetaliationOutcome; critFail?: CritEffectFx; strikes?: StrikeFx[] }
  | { kind: "spell"; spellName: string; changes: { name: string; change: number }[]; targetCount: number }
  | { kind: "morale-extra" | "morale-skip"; name: string; d10: number; morale: number };

export type ActionResultFx = Extract<ResultFx, { kind: "hit" | "crit" | "miss" | "spell" }>;

export const isActionResult = (fx: ResultFx | null): fx is ActionResultFx => !!fx && fx.kind !== "morale-extra" && fx.kind !== "morale-skip";

export interface BattleLogState {
  open: boolean;
  focus: number | null;
}

export interface BattleLogPanel extends BattleLogState {
  show(focus?: number | null): void;
  close(): void;
}

/** Наміри гравця, що їх карта передає майстрам (не мутації — ті в `actions`). */
export interface BattleSceneIntents {
  attack: AttackIntent | null;
  requestAttack(intent: AttackIntent): void;
  clearAttack(): void;
  /** Наведення шаблону заклинання на карті: клік по клітинці ставить точку замість руху чи атаки */
  mapAim: MapAim | null;
  setMapAim(aim: MapAim | null): void;
  /** Фаза ходу поточного героя дозволяє атаку — лише тоді клік по ворогу стає наміром, а не вибором */
  attackReady: boolean;
  /** MyTurnControls повідомляє id героя, чия фаза дозволяє атаку; null — не дозволяє */
  setAttackReady(heroId: string | null): void;
}

export interface BattleSceneActions {
  nextTurn: ReturnType<typeof useNextTurn>;
  attack: ReturnType<typeof useAttack>;
  moraleCheck: ReturnType<typeof useMoraleCheck>;
  move: ReturnType<typeof useMoveParticipant>;
  mapTerrain: ReturnType<typeof useMapTerrain>;
  maze: ReturnType<typeof useMazeAction>;
  mazeMark: ReturnType<typeof useMazeMark>;
  bonusAction: ReturnType<typeof useBonusAction>;
  abilityAction: ReturnType<typeof useAbilityAction>;
  auraZone: ReturnType<typeof useAuraZone>;
  castSpell: ReturnType<typeof useCastSpell>;
  start: ReturnType<typeof useStartBattle>;
  reset: ReturnType<typeof useResetBattle>;
  complete: ReturnType<typeof useCompleteBattle>;
  rollback: ReturnType<typeof useRollbackBattleAction>;
  addParticipant: ReturnType<typeof useAddBattleParticipant>;
  reveal: ReturnType<typeof useRevealBattleParticipants>;
  updateParticipant: ReturnType<typeof useUpdateBattleParticipant>;
  scaleUnits: ReturnType<typeof useScaleBattleUnits>;
  unitControl: ReturnType<typeof useUnitControl>;
  refreshSources: ReturnType<typeof useRefreshBattleSources>;
}

export interface BattleSceneTurn {
  current: BattleParticipant | null;
  isMyTurn: boolean;
  queue: QueueEntry[];
}

export interface BattleSceneRoster {
  allies: BattleParticipant[];
  enemies: BattleParticipant[];
  reserve: BattleParticipant[];
  myParticipants: BattleParticipant[];
  hero: BattleParticipant | null;
}

export interface DmControl {
  id: string | null;
  set(id: string | null): void;
}

/** Змінюється лише разом з даними бою — список учасників, черга, герой. */
export interface BattleSceneData {
  campaignId: string;
  battleId: string;
  battle: BattleScene;
  viewer: Viewer;
  turn: BattleSceneTurn;
  roster: BattleSceneRoster;
  awaiting: "victory" | "defeat" | null;
  effects: Map<string, ActiveEffect[]>;
  dmControl: DmControl;
  select(id: string | null): void;
  /** Клік по учаснику в списку: ворог у свій хід — атака, інакше — вибір */
  clickParticipant(id: string): void;
  readBattle(): BattleScene | undefined;
}

export interface DialogState {
  open: boolean;
  setOpen(open: boolean): void;
}

export interface BattleSceneDialogs {
  awaitingDm: DialogState;
  resultScreen: DialogState;
}

export interface BattleSceneResult {
  fx: ResultFx | null;
  show(fx: ResultFx | null): void;
}

export interface BattleSceneValue extends BattleSceneData {
  dialogs: BattleSceneDialogs;
  connection: PusherConnectionState;
  selectedId: string | null;
  intents: BattleSceneIntents;
  toast: BattleToastApi;
  result: BattleSceneResult;
  log: BattleLogPanel;
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
  const { campaignId, battleId, battle, viewer, turn, roster, awaiting, effects, dmControl, select, clickParticipant, readBattle } = value;

  return useMemo(
    () => ({ campaignId, battleId, battle, viewer, turn, roster, awaiting, effects, dmControl, select, clickParticipant, readBattle }),
    [campaignId, battleId, battle, viewer, turn, roster, awaiting, effects, dmControl, select, clickParticipant, readBattle],
  );
}

export function deriveScene(battle: BattleScene, userId: string | null, dmControlledId: string | null) {
  const isDM = battle.isDM === true;

  const order = battle.initiativeOrder ?? [];

  const reserveAll = reserveOf(battle.pendingSummons ?? []);

  const awaiting = battle.status === BattleStatus.ACTIVE ? checkVictoryConditions(order, reserveAll, { maze: !!battle.map?.maze }).awaiting : null;

  const { current, isMyTurn, myParticipants, hero } = deriveTurn(battle, userId, isDM, dmControlledId, awaiting !== null);

  return {
    viewer: { userId, isDM, canSeeEnemyHp: canSeeEnemyHp(hero, order) },
    turn: { current, isMyTurn, queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound) },
    roster: {
      allies: order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY),
      enemies: order.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY),
      reserve: isDM ? reserveAll : NO_ORDER,
      myParticipants,
      hero,
    },
    awaiting,
  };
}

export function deriveTurn(battle: BattleScene, userId: string | null, isDM: boolean, dmControlledId: string | null, awaiting = false) {
  const order = battle.initiativeOrder ?? [];

  const current = order[battle.currentTurnIndex] ?? null;

  const myParticipants = order.filter((p) => p.basicInfo.controlledBy === userId);

  const controls = (p: BattleParticipant) =>
    p.basicInfo.controlledBy === userId ||
    (isDM && (p.basicInfo.id === dmControlledId || p.basicInfo.controlledBy === CONTROLLED_BY_DM || p.basicInfo.side === ParticipantSide.ENEMY));

  const isMyTurn = battle.status === BattleStatus.ACTIVE && !awaiting && !!current && !!userId && controls(current);

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

  const [attackIntent, setAttackIntent] = useState<AttackIntent | null>(null);

  const clearAttackIntent = useCallback(() => setAttackIntent(null), []);

  const [mapAim, setMapAim] = useState<MapAim | null>(null);

  const [attackReadyId, setAttackReady] = useState<string | null>(null);

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
    move: useMoveParticipant(campaignId, battleId, o),
    mapTerrain: useMapTerrain(campaignId, battleId, o),
    maze: useMazeAction(campaignId, battleId, o),
    mazeMark: useMazeMark(campaignId, battleId, o),
    bonusAction: useBonusAction(campaignId, battleId, o),
    abilityAction: useAbilityAction(campaignId, battleId, o),
    auraZone: useAuraZone(campaignId, battleId, o),
    castSpell: useCastSpell(campaignId, battleId, o),
    start: useStartBattle(campaignId, battleId, o),
    reset: useResetBattle(campaignId, battleId, o),
    complete: useCompleteBattle(campaignId, battleId, o),
    rollback: useRollbackBattleAction(campaignId, battleId, o),
    addParticipant: useAddBattleParticipant(campaignId, battleId, o),
    reveal: useRevealBattleParticipants(campaignId, battleId, o),
    updateParticipant: useUpdateBattleParticipant(campaignId, battleId, o),
    scaleUnits: useScaleBattleUnits(campaignId, battleId, o),
    unitControl: useUnitControl(campaignId, battleId, o),
    refreshSources: useRefreshBattleSources(campaignId, battleId, o),
  };

  const readBattle = useCallback(
    () => queryClient.getQueryData<BattleScene>(battleQueryKey(campaignId, battleId)),
    [queryClient, campaignId, battleId],
  );

  const logHistory = useBattleLogHistory(campaignId, battleId, battle?.battleLog);

  const derived = useMemo(() => (battle ? deriveScene(battle, userId, dmControlledId) : null), [battle, userId, dmControlledId]);

  const [dismissedAwaiting, setDismissedAwaiting] = useState<"victory" | "defeat" | null>(null);

  const awaitingNow = derived?.awaiting ?? null;

  if (!awaitingNow && dismissedAwaiting) setDismissedAwaiting(null);

  const awaitingDm: DialogState = {
    open: !!derived?.viewer.isDM && !!awaitingNow && dismissedAwaiting !== awaitingNow,
    setOpen: (open) => setDismissedAwaiting(open ? null : awaitingNow),
  };

  const [resultDismissed, setResultDismissed] = useState(false);

  const resultScreen: DialogState = {
    open: battle?.status === BattleStatus.COMPLETED && !resultDismissed,
    setOpen: (open) => setResultDismissed(!open),
  };

  const order = battle?.initiativeOrder;

  const effects = useDisplayEffectMap(order ?? NO_ORDER);

  const dmControl = useMemo<DmControl>(() => ({ id: dmControlledId, set: setDmControlledId }), [dmControlledId]);

  const [resultFx, showResult] = useState<ResultFx | null>(null);

  const anyPending = Object.values(actions).some((m) => m.isPending);

  const attackReady = !!attackReadyId && attackReadyId === derived?.turn.current?.basicInfo.id;

  const clickParticipant = useParticipantClick(battle && derived ? { battle, turn: derived.turn, anyPending, attackReady, select, requestAttack: setAttackIntent } : null);

  if (attackIntent && battle && isIntentStale(attackIntent, { round: battle.currentRound, turnIndex: battle.currentTurnIndex })) setAttackIntent(null);

  if (!battle || !derived) return { value: null, loading: isLoading };

  const value: BattleSceneValue = {
    campaignId,
    battleId,
    battle,
    ...derived,
    effects,
    dialogs: { awaitingDm, resultScreen },
    connection: connectionState,
    dmControl,
    selectedId,
    select,
    clickParticipant,
    intents: { attack: attackIntent, requestAttack: setAttackIntent, clearAttack: clearAttackIntent, mapAim, setMapAim, attackReady, setAttackReady },
    toast,
    result: { fx: resultFx, show: showResult },
    log: { ...log, show: openLog, close: closeLog },
    readBattle,
    logHistory,
    actions,
    anyPending,
  };

  return { value, loading: isLoading };
}
