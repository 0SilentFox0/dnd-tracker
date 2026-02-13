"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { usePusherBattleSync } from "./usePusherBattleSync";

import type { CounterAttackResultInfo } from "@/components/battle/dialogs/CounterAttackResultDialog";
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
} from "@/lib/hooks/useBattles";
import { createClient } from "@/lib/supabase/client";
import type { BattleScene } from "@/types/api";
import type { AttackData } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export function useBattleSceneLogic(id: string, battleId: string) {
  const queryClient = useQueryClient();

  const [attackDialogOpen, setAttackDialogOpen] = useState(false);

  const [spellDialogOpen, setSpellDialogOpen] = useState(false);

  const [moraleDialogOpen, setMoraleDialogOpen] = useState(false);

  const [participantForMorale, setParticipantForMorale] =
    useState<BattleParticipant | null>(null);

  const [moraleDialogDismissedFor, setMoraleDialogDismissedFor] = useState<
    string | null
  >(null);

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

  const nextTurnClickedAtRef = useRef<number | null>(null);

  const nextTurnMutation = useNextTurn(id, battleId);

  const { data: battle, isLoading: loading } = useBattle(id, battleId, {
    pauseRefetchWhen: nextTurnMutation.isPending,
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

  const attackMutation = useAttack(id, battleId);

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

  const { connectionState } = usePusherBattleSync(id, battleId, currentUserId, handleTurnStarted);

  const isDM = useMemo(() => battle?.isDM || false, [battle]);

  const currentParticipant = useMemo(() => {
    if (!battle) return null;

    return battle.initiativeOrder[battle.currentTurnIndex] || null;
  }, [battle]);

  // Лог коли відрендерився наступний хід (після натискання кнопки)
  const prevTurnIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (!battle || battle.status !== "active") return;

    const turnIndex = battle.currentTurnIndex;
    const prev = prevTurnIndexRef.current;

    if (prev !== null && prev !== turnIndex && nextTurnClickedAtRef.current !== null) {
      const elapsed = Date.now() - nextTurnClickedAtRef.current;
      const participant = battle.initiativeOrder?.[turnIndex]?.basicInfo?.name;
      if (process.env.NODE_ENV === "development") {
        console.info("[turn-timing] Наступний хід: відрендерено в UI", {
          elapsedMs: elapsed,
          elapsedSec: (elapsed / 1000).toFixed(1),
          participant,
        });
      }
      nextTurnClickedAtRef.current = null;
    }

    prevTurnIndexRef.current = turnIndex;
  }, [battle]);

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

  const handleNextTurn = async () => {
    if (!battle) return;

    const clickedAt = Date.now();
    nextTurnClickedAtRef.current = clickedAt;
    if (process.env.NODE_ENV === "development") {
      console.info("[turn-timing] Наступний хід: кнопка натиснута", {
        at: new Date(clickedAt).toISOString(),
        turnIndex: battle.currentTurnIndex,
        participant: battle.initiativeOrder?.[battle.currentTurnIndex]?.basicInfo?.name,
      });
    }

    setMoraleDialogDismissedFor(null);
    setParticipantForMorale(null);
    setMoraleDialogOpen(false);
    nextTurnMutation.mutate(undefined, {
      onSuccess: (updatedBattle) => {
        const elapsed = Date.now() - clickedAt;
        const nextParticipant = updatedBattle?.initiativeOrder?.[updatedBattle.currentTurnIndex]?.basicInfo?.name;
        if (process.env.NODE_ENV === "development") {
          console.info("[turn-timing] Наступний хід: відповідь API отримана", {
            elapsedMs: elapsed,
            elapsedSec: (elapsed / 1000).toFixed(1),
            nextParticipant,
          });
        }
      },
    });
  };

  const handleStartBattle = () => startBattleMutation.mutate();

  const handleCompleteBattle = useCallback(
    (result?: "victory" | "defeat") => {
      completeBattleMutation.mutate(result ? { result } : undefined);
    },
    [completeBattleMutation],
  );

  const handleAttack = useCallback(
    (data: AttackData, onSuccess?: () => void) => {
      attackMutation.mutate(data, {
        onSuccess: (updatedBattle: BattleScene) => {
          const log = updatedBattle?.battleLog ?? [];

          const lastAction = log[log.length - 1];

          const hpChanges = lastAction?.hpChanges ?? [];

          triggerGlobalDamageFromBattle(updatedBattle);

          if (hpChanges.length >= 2) {
            setCounterAttackInfo({
              defenderName: hpChanges[0].participantName,
              attackerName: hpChanges[1].participantName,
              damage: hpChanges[1].change ?? 0,
            });
            setCounterAttackDialogOpen(true);
          }

          onSuccess?.();
        },
      });
    },
    [attackMutation, triggerGlobalDamageFromBattle],
  );

  // Діагностика в консолі браузера: що бачить UI для магії учасників (knownSpells)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      battle?.status === "active" &&
      battle?.initiativeOrder?.length
    ) {
      const participants = battle.initiativeOrder as BattleParticipant[];

      console.log("[Battle Spells] Учасники в initiativeOrder (що бачить UI):", {
        isDM: battle.isDM,
        participants: participants.map((p) => ({
          name: p.basicInfo?.name,
          id: p.basicInfo?.id,
          knownSpells_count: p.spellcasting?.knownSpells?.length ?? 0,
          knownSpells_sample: (p.spellcasting?.knownSpells ?? []).slice(0, 5),
          attacks_count: p.battleData?.attacks?.length ?? 0,
          hasRanged: p.battleData?.attacks?.some(
            (a) => a.type === "ranged" || (a.range && a.range !== "5 ft"),
          ),
        })),
      });
    }
  }, [battle]);

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
      attack: attackMutation,
      spell: spellMutation,
      moraleCheck: moraleCheckMutation,
      bonusAction: bonusActionMutation,
      startBattle: startBattleMutation,
    },
    handlers: {
      handleNextTurn,
      handleStartBattle,
      handleCompleteBattle,
      handleRollback: (actionIndex: number) =>
        rollbackMutation.mutate(actionIndex),
      handleAttack,
      handleBonusAction: (participantId: string, skillId: string, targetParticipantId?: string) =>
        bonusActionMutation.mutate({
          participantId,
          skillId,
          targetParticipantId,
        }),
      setParticipantForMorale,
      triggerGlobalDamageFromBattle,
      clearGlobalDamageFlash: () => setGlobalDamageFlash(null),
    },
    dmControlledParticipantId,
    setDmControlledParticipantId,
    addParticipantMutation,
    updateParticipantMutation,
    globalDamageFlash,
    turnStartedNotification,
    pusherConnectionState: connectionState,
  };
}
