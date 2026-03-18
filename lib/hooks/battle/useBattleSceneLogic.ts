"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useBattleSceneTurnLog } from "./useBattleSceneLogic-effects";
import { useBattleSceneHandlers } from "./useBattleSceneLogic-handlers";
import { usePusherBattleSync } from "./usePusherBattleSync";

import type { CounterAttackResultInfo } from "@/components/battle/dialogs/CounterAttackResultDialog";
import { ParticipantSide } from "@/lib/constants/battle";
import {
  useAddBattleParticipant,
  useAttackAndNextTurn,
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
import { createClient } from "@/lib/supabase/client";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export function useBattleSceneLogic(id: string, battleId: string) {
  useQueryClient(); // kept for cache invalidation in future

  const [attackDialogOpen, setAttackDialogOpen] = useState(false);

  const [spellDialogOpen, setSpellDialogOpen] = useState(false);

  const [moraleDialogOpen, setMoraleDialogOpen] = useState(false);

  const [, setParticipantForMorale] =
    useState<BattleParticipant | null>(null);

  const [, setMoraleDialogDismissedFor] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [counterAttackInfo, setCounterAttackInfo] =
    useState<CounterAttackResultInfo | null>(null);

  const [counterAttackDialogOpen, setCounterAttackDialogOpen] = useState(false);

  const [globalDamageFlash, setGlobalDamageFlash] = useState<{
    value: number;
    isHealing: boolean;
  } | null>(null);

  const [turnStartedNotification, setTurnStartedNotification] = useState<
    string | null
  >(null);

  const [dmControlledParticipantId, setDmControlledParticipantId] = useState<
    string | null
  >(null);

  const [dmSpellCasterId, setDmSpellCasterId] = useState<string | null>(null);

  const nextTurnClickedAtRef = useRef<number | null>(null);

  const nextTurnMutation = useNextTurn(id, battleId);

  const attackAndNextTurnMutation = useAttackAndNextTurn(id, battleId);

  const { data: battle, isLoading: loading } = useBattle(id, battleId, {
    pauseRefetchWhen:
      nextTurnMutation.isPending || attackAndNextTurnMutation.isPending,
  });

  const triggerGlobalDamageFromBattle = useCallback(
    (updatedBattle: BattleScene) => {
      const log = updatedBattle?.battleLog ?? [];

      const lastAction = log[log.length - 1];

      const hpChanges = lastAction?.hpChanges ?? [];

      if (hpChanges.length > 0) {
        const first = hpChanges[0];

        const change = first?.change ?? 0;

        if (change !== 0) {
          setGlobalDamageFlash({
            value: Math.abs(change),
            isHealing: change < 0,
          });
        }
      }
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const resetBattleMutation = useResetBattle(id, battleId);

  const completeBattleMutation = useCompleteBattle(id, battleId);

  const rollbackMutation = useRollbackBattleAction(id, battleId);

  const spellMutation = useCastSpell(id, battleId);

  const moraleCheckMutation = useMoraleCheck(id, battleId);

  const bonusActionMutation = useBonusAction(id, battleId);

  const startBattleMutation = useStartBattle(id, battleId);

  const addParticipantMutation = useAddBattleParticipant(id, battleId);

  const updateParticipantMutation = useUpdateBattleParticipant(id, battleId);

  const handleTurnStarted = useCallback((message: string) => {
    setTurnStartedNotification(message);
    setTimeout(() => setTurnStartedNotification(null), 4000);
  }, []);

  const { connectionState } = usePusherBattleSync(
    id,
    battleId,
    currentUserId,
    handleTurnStarted,
  );

  const isDM = useMemo(() => battle?.isDM || false, [battle]);

  const currentParticipant = useMemo(() => {
    if (!battle) return null;

    return battle.initiativeOrder[battle.currentTurnIndex] || null;
  }, [battle]);

  const attackFlowStartRef = useRef<number | null>(null);

  useBattleSceneTurnLog(battle, attackFlowStartRef, nextTurnClickedAtRef);

  const {
    handleNextTurn,
    handleStartBattle,
    handleCompleteBattle,
    handleAttack,
    handleRollback,
    handleBonusAction,
  } = useBattleSceneHandlers({
    battle,
    nextTurnMutation,
    nextTurnClickedAtRef,
    attackFlowStartRef,
    setMoraleDialogDismissedFor,
    setParticipantForMorale,
    setMoraleDialogOpen,
    attackAndNextTurnMutation,
    triggerGlobalDamageFromBattle,
    setCounterAttackInfo,
    setCounterAttackDialogOpen,
    completeBattleMutation,
    startBattleMutation,
    rollbackMutation,
    bonusActionMutation,
  });

  const isCurrentPlayerTurn = useMemo(() => {
    if (!currentParticipant?.basicInfo || !currentUserId) return false;

    // Якщо це хід користувача, який контролює персонажа
    if (currentParticipant.basicInfo.controlledBy === currentUserId)
      return true;

    // Якщо я DM
    if (isDM) {
      // DM взяв керування за цим учасником
      if (currentParticipant.basicInfo.id === dmControlledParticipantId)
        return true;

      // І це хід персонажа під контролем DM
      if (currentParticipant.basicInfo.controlledBy === "dm") return true;

      // Або це хід ворога (для сумісності)
      if (currentParticipant.basicInfo.side === ParticipantSide.ENEMY)
        return true;
    }

    return false;
  }, [currentParticipant, currentUserId, isDM, dmControlledParticipantId]);

  const allies = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant): p is BattleParticipant =>
        p?.basicInfo?.side === ParticipantSide.ALLY,
    );
  }, [battle]);

  const enemies = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant): p is BattleParticipant =>
        p?.basicInfo?.side === ParticipantSide.ENEMY,
    );
  }, [battle]);

  const canSeeEnemyHp = useMemo(() => {
    if (!battle || isDM) return isDM;

    if (!currentParticipant) return false;

    const skills = currentParticipant.battleData?.activeSkills ?? [];

    return (
      skills.some(
        (skill: { name?: string; effects?: Array<{ type?: string }> }) =>
          skill.name?.toLowerCase().includes("enemy hp") ||
          skill.name?.toLowerCase().includes("detect") ||
          skill.effects?.some((e) => e.type === "see_enemy_hp"),
      ) ?? false
    );
  }, [battle, isDM, currentParticipant]);

  const availableTargets = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant): p is BattleParticipant =>
        p?.combatStats?.status === "active",
    );
  }, [battle]);

  return {
    battle,
    loading,
    isDM,
    currentParticipant,
    isCurrentPlayerTurn,
    allies,
    enemies,
    canSeeEnemyHp,
    availableTargets,
    dialogs: {
      attack: { open: attackDialogOpen, setOpen: setAttackDialogOpen },
      spell: { open: spellDialogOpen, setOpen: setSpellDialogOpen },
      morale: { open: moraleDialogOpen, setOpen: setMoraleDialogOpen },
      counterAttack: {
        open: counterAttackDialogOpen,
        setOpen: setCounterAttackDialogOpen,
        info: counterAttackInfo,
      },
    },
    mutations: {
      nextTurn: nextTurnMutation,
      resetBattle: resetBattleMutation,
      completeBattle: completeBattleMutation,
      rollback: rollbackMutation,
      attack: attackAndNextTurnMutation,
      spell: spellMutation,
      moraleCheck: moraleCheckMutation,
      bonusAction: bonusActionMutation,
      startBattle: startBattleMutation,
    },
    handlers: {
      handleNextTurn,
      handleStartBattle,
      handleCompleteBattle,
      handleRollback,
      handleAttack,
      handleBonusAction,
      setParticipantForMorale,
      triggerGlobalDamageFromBattle,
      clearGlobalDamageFlash: () => setGlobalDamageFlash(null),
    },
    dmControlledParticipantId,
    setDmControlledParticipantId,
    dmSpellCasterId,
    setDmSpellCasterId,
    addParticipantMutation,
    updateParticipantMutation,
    globalDamageFlash,
    turnStartedNotification,
    pusherConnectionState: connectionState,
  };
}
