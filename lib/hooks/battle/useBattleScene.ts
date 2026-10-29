"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { type DialogState, useAwaitingDmDialog } from "./useAwaitingDmDialog";
import { useBattleActions } from "./useBattleActions";
import { useBattleLogHistory } from "./useBattleLogHistory";
import { useBattleToast } from "./useBattleToast";
import { useDisplayEffectMap } from "./useDisplayEffectMap";
import { useParticipantClick } from "./useParticipantClick";
import { usePusherBattleSync } from "./usePusherBattleSync";

import { BattleStatus } from "@/lib/constants/battle";
import type { BattleSceneData, BattleSceneValue } from "@/lib/hooks/battle/types";
import { battleQueryKey, useBattle } from "@/lib/hooks/battles";
import { type AttackIntent, isIntentStale } from "@/lib/utils/battle/flows";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import { deriveScene } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";
import type { BattleLogState, DmControl, ResultFx } from "@/types/battle-scene";

const NO_ORDER: BattleParticipant[] = [];

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


export function useBattleSceneValue(campaignId: string, battleId: string, userId: string | null) {
  const queryClient = useQueryClient();

  const toast = useBattleToast();

  const { show } = toast;

  const [dmControlledId, setDmControlledId] = useState<string | null>(null);

  const [selectedId, select] = useState<string | null>(null);

  const [attackIntent, setAttackIntent] = useState<AttackIntent | null>(null);

  const clearAttackIntent = useCallback(() => setAttackIntent(null), []);

  const [mapAim, setMapAim] = useState<MapAim | null>(null);

  const [mapPick, setMapPick] = useState<MapPick | null>(null);

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

  const { data: battle, isLoading } = useBattle(campaignId, battleId, { pausePolling: connectionState === "connected" });

  const actions = useBattleActions(campaignId, battleId, show);

  const readBattle = useCallback(
    () => queryClient.getQueryData<BattleScene>(battleQueryKey(campaignId, battleId)),
    [queryClient, campaignId, battleId],
  );

  const logHistory = useBattleLogHistory(campaignId, battleId, battle?.battleLog);

  const derived = useMemo(() => (battle ? deriveScene(battle, userId, dmControlledId) : null), [battle, userId, dmControlledId]);

  const awaitingDm = useAwaitingDmDialog(!!derived?.viewer.isDM, derived?.awaiting ?? null);

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
    intents: { attack: attackIntent, requestAttack: setAttackIntent, clearAttack: clearAttackIntent, mapAim, setMapAim, mapPick, setMapPick, attackReady, setAttackReady },
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
