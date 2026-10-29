"use client";

import { useCallback } from "react";

import type { BattleSceneActions } from "@/lib/hooks/battle/types";
import {
  useAbilityAction,
  useAddBattleParticipant,
  useAttack,
  useAuraZone,
  useBattleConditions,
  useBattleCoreAction,
  useBonusAction,
  useCastSpell,
  useCompleteBattle,
  useCritChoice,
  useMapTerrain,
  useMapWeather,
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

/** Усі мутації бою; збої й конфлікти йдуть у тост. */
export function useBattleActions(campaignId: string, battleId: string, showToast: (message: string) => void): BattleSceneActions {
  const onConflict = useCallback(() => showToast("Стан бою змінився, повторіть дію"), [showToast]);

  const o = { onConflict, onFailure: showToast };

  return {
    nextTurn: useNextTurn(campaignId, battleId, o),
    attack: useAttack(campaignId, battleId, o),
    moraleCheck: useMoraleCheck(campaignId, battleId, o),
    critChoice: useCritChoice(campaignId, battleId, o),
    move: useMoveParticipant(campaignId, battleId, o),
    mapTerrain: useMapTerrain(campaignId, battleId, o),
    maze: useMazeAction(campaignId, battleId, o),
    mazeMark: useMazeMark(campaignId, battleId, o),
    mapWeather: useMapWeather(campaignId, battleId, o),
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
    conditions: useBattleConditions(campaignId, battleId, o),
    coreAction: useBattleCoreAction(campaignId, battleId, o),
    updateParticipant: useUpdateBattleParticipant(campaignId, battleId, o),
    scaleUnits: useScaleBattleUnits(campaignId, battleId, o),
    unitControl: useUnitControl(campaignId, battleId, o),
    refreshSources: useRefreshBattleSources(campaignId, battleId, o),
  };
}
