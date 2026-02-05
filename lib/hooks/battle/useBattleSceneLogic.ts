"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ParticipantSide } from "@/lib/constants/battle";
import {
  useAttack,
  useBattle,
  useCastSpell,
  useMoraleCheck,
  useNextTurn,
  useResetBattle,
  useStartBattle,
} from "@/lib/hooks/useBattles";
import { createClient } from "@/lib/supabase/client";
import type { BattleScene } from "@/types/api";
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

  const { data: battle, isLoading: loading } = useBattle(id, battleId);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const nextTurnMutation = useNextTurn(id, battleId);
  const resetBattleMutation = useResetBattle(id, battleId);
  const attackMutation = useAttack(id, battleId);
  const spellMutation = useCastSpell(id, battleId);
  const moraleCheckMutation = useMoraleCheck(id, battleId);
  const startBattleMutation = useStartBattle(id, battleId);

  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY) {
      let pusher: ReturnType<typeof import("@/lib/pusher").getPusherClient> =
        null;
      import("@/lib/pusher").then(({ getPusherClient }) => {
        pusher = getPusherClient();
        if (pusher) {
          const channel = pusher.subscribe(`battle-${battleId}`);
          channel.bind("battle-updated", () => {
            queryClient.invalidateQueries({
              queryKey: ["battle", id, battleId],
            });
          });
          channel.bind("battle-started", () => {
            queryClient.invalidateQueries({
              queryKey: ["battle", id, battleId],
            });
          });
        }
      });
      return () => {
        if (pusher) pusher.unsubscribe(`battle-${battleId}`);
      };
    }
  }, [battleId, id, queryClient]);

  const isDM = useMemo(() => battle?.isDM || false, [battle]);

  const currentParticipant = useMemo(() => {
    if (!battle) return null;
    return battle.initiativeOrder[battle.currentTurnIndex] || null;
  }, [battle]);

  const isCurrentPlayerTurn = useMemo(() => {
    if (!currentParticipant?.basicInfo || !currentUserId) return false;

    // Якщо це хід користувача, який контролює персонажа
    if (currentParticipant.basicInfo.controlledBy === currentUserId)
      return true;

    // Якщо я DM
    if (isDM) {
      // І це хід персонажа під контролем DM
      if (currentParticipant.basicInfo.controlledBy === "dm") return true;

      // Або це хід ворога (для сумісності)
      if (currentParticipant.basicInfo.side === ParticipantSide.ENEMY)
        return true;
    }

    return false;
  }, [currentParticipant, currentUserId, isDM]);

  const handleNextTurn = async () => {
    if (!battle) return;
    setMoraleDialogDismissedFor(null);
    setParticipantForMorale(null);
    setMoraleDialogOpen(false);
    nextTurnMutation.mutate();
  };

  const handleStartBattle = () => startBattleMutation.mutate();

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
    return (
      currentParticipant.battleData?.activeSkills?.some(
        (skill: any) =>
          skill.name?.toLowerCase().includes("enemy hp") ||
          skill.name?.toLowerCase().includes("detect") ||
          skill.effects?.some((e: any) => e.type === "see_enemy_hp"),
      ) || false
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
    },
    mutations: {
      nextTurn: nextTurnMutation,
      resetBattle: resetBattleMutation,
      attack: attackMutation,
      spell: spellMutation,
      moraleCheck: moraleCheckMutation,
      startBattle: startBattleMutation,
    },
    handlers: {
      handleNextTurn,
      handleStartBattle,
      setParticipantForMorale,
    },
  };
}
