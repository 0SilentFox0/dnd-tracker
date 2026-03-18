/**
 * Обробники дій для useBattleSceneLogic (next turn, attack, start, complete).
 */

import { useCallback } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

import type { BattleScene } from "@/types/api";
import type { AttackData } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export interface BattleSceneHandlersParams {
  battle: BattleScene | null | undefined;
  nextTurnMutation: UseMutationResult<unknown, Error, void, unknown>;
  nextTurnClickedAtRef: React.MutableRefObject<number | null>;
  attackFlowStartRef: React.MutableRefObject<number | null>;
  setMoraleDialogDismissedFor: (v: string | null) => void;
  setParticipantForMorale: React.Dispatch<React.SetStateAction<BattleParticipant | null>>;
  setMoraleDialogOpen: (v: boolean) => void;
  attackAndNextTurnMutation: UseMutationResult<
    BattleScene,
    Error,
    AttackData,
    unknown
  >;
  triggerGlobalDamageFromBattle: (updatedBattle: BattleScene) => void;
  setCounterAttackInfo: (v: {
    defenderName: string;
    attackerName: string;
    damage: number;
    baseDamage?: number;
    bonusPercent?: number;
  } | null) => void;
  setCounterAttackDialogOpen: (v: boolean) => void;
  completeBattleMutation: UseMutationResult<
    unknown,
    Error,
    { result?: "victory" | "defeat" } | undefined,
    unknown
  >;
  startBattleMutation: UseMutationResult<unknown, Error, void, unknown>;
  rollbackMutation: UseMutationResult<unknown, Error, number, unknown>;
  bonusActionMutation: UseMutationResult<
    unknown,
    Error,
    { participantId: string; skillId: string; targetParticipantId?: string },
    unknown
  >;
}

export function useBattleSceneHandlers({
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
}: BattleSceneHandlersParams) {
  const handleNextTurn = useCallback(async () => {
    if (!battle) return;

    const clickedAt = Date.now();

    nextTurnClickedAtRef.current = clickedAt;

    const flowStart = attackFlowStartRef.current;

    console.info("[хід-таймінг] nextTurn: запит відправлено", {
      elapsedFromAttackStart:
        flowStart != null ? `${clickedAt - flowStart}ms` : "—",
    });
    setMoraleDialogDismissedFor(null);
    setParticipantForMorale(null);
    setMoraleDialogOpen(false);
    nextTurnMutation.mutate(undefined, {
      onSuccess: () => {
        const done = Date.now();

        const nextTurnElapsed = done - clickedAt;

        const totalFromAttack = flowStart != null ? done - flowStart : null;

        console.info("[хід-таймінг] nextTurn: відповідь отримано", {
          nextTurnMs: nextTurnElapsed,
          totalFromAttackStartMs: totalFromAttack,
        });
      },
    });
  }, [
    battle,
    nextTurnMutation,
    nextTurnClickedAtRef,
    attackFlowStartRef,
    setMoraleDialogDismissedFor,
    setParticipantForMorale,
    setMoraleDialogOpen,
  ]);

  const handleStartBattle = useCallback(() => {
    startBattleMutation.mutate();
  }, [startBattleMutation]);

  const handleCompleteBattle = useCallback(
    (result?: "victory" | "defeat") => {
      completeBattleMutation.mutate(result != null ? { result } : {});
    },
    [completeBattleMutation],
  );

  const handleAttack = useCallback(
    (data: AttackData, onSuccess?: () => void) => {
      attackAndNextTurnMutation.mutate(data, {
        onSuccess: (updatedBattle: BattleScene) => {
          const log = updatedBattle?.battleLog ?? [];

          const lastAction = log[log.length - 1];

          const hpChanges = lastAction?.hpChanges ?? [];

          triggerGlobalDamageFromBattle(updatedBattle);

          if (hpChanges.length >= 2) {
            const details = lastAction?.actionDetails as
              | {
                  counterReactionDamage?: number;
                  counterReactionBaseDamage?: number;
                  counterReactionBonusPercent?: number;
                }
              | undefined;

            const counterChange = hpChanges.find(
              (h) =>
                h.participantId !== hpChanges[0].participantId &&
                (h.change ?? 0) > 0,
            );

            if (counterChange) {
              setCounterAttackInfo({
                defenderName: hpChanges[0].participantName ?? "",
                attackerName: counterChange.participantName ?? "",
                damage: counterChange.change ?? 0,
                baseDamage: details?.counterReactionBaseDamage,
                bonusPercent: details?.counterReactionBonusPercent,
              });
              setCounterAttackDialogOpen(true);
            }
          }

          onSuccess?.();
        },
      });
    },
    [
      attackAndNextTurnMutation,
      triggerGlobalDamageFromBattle,
      setCounterAttackInfo,
      setCounterAttackDialogOpen,
    ],
  );

  const handleRollback = useCallback(
    (actionIndex: number) => rollbackMutation.mutate(actionIndex),
    [rollbackMutation],
  );

  const handleBonusAction = useCallback(
    (
      participantId: string,
      skillId: string,
      targetParticipantId?: string,
    ) => {
      bonusActionMutation.mutate({
        participantId,
        skillId,
        targetParticipantId,
      });
    },
    [bonusActionMutation],
  );

  return {
    handleNextTurn,
    handleStartBattle,
    handleCompleteBattle,
    handleAttack,
    handleRollback,
    handleBonusAction,
  };
}
