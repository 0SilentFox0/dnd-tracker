/**
 * Обробники дій для useBattleSceneLogic (next turn, attack, start, complete).
 */

import { useCallback } from "react";
import type { UseMutationResult } from "@tanstack/react-query";

import type { BattleScene } from "@/types/api";
import type { AttackData } from "@/types/api";

export interface BattleSceneHandlersParams {
  battle: BattleScene | null | undefined;
  nextTurnMutation: UseMutationResult<unknown, Error, object, unknown>;
  readBattle: () => BattleScene | undefined;
  nextTurnClickedAtRef: React.MutableRefObject<number | null>;
  attackFlowStartRef: React.MutableRefObject<number | null>;
  attackAndNextTurnMutation: UseMutationResult<
    unknown,
    Error,
    AttackData & { endTurn?: boolean },
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
    { result?: "victory" | "defeat" },
    unknown
  >;
  startBattleMutation: UseMutationResult<unknown, Error, object, unknown>;
  rollbackMutation: UseMutationResult<unknown, Error, { actionIndex: number }, unknown>;
  bonusActionMutation: UseMutationResult<
    unknown,
    Error,
    { participantId: string; abilityKey: string; targetParticipantId?: string },
    unknown
  >;
}

export function useBattleSceneHandlers({
  battle,
  nextTurnMutation,
  nextTurnClickedAtRef,
  attackFlowStartRef,
  attackAndNextTurnMutation,
  readBattle,
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
    nextTurnMutation.mutate({}, {
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
  ]);

  const handleStartBattle = useCallback(() => {
    startBattleMutation.mutate({});
  }, [startBattleMutation]);

  const handleCompleteBattle = useCallback(
    (result?: "victory" | "defeat") => {
      completeBattleMutation.mutate(result != null ? { result } : {});
    },
    [completeBattleMutation],
  );

  const handleAttack = useCallback(
    (data: AttackData, onSuccess?: () => void) => {
      attackAndNextTurnMutation.mutate({ ...data, endTurn: true }, {
        onSuccess: () => {
          const updatedBattle = readBattle();

          if (!updatedBattle) return;

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
      readBattle,
      triggerGlobalDamageFromBattle,
      setCounterAttackInfo,
      setCounterAttackDialogOpen,
    ],
  );

  const handleRollback = useCallback(
    (actionIndex: number) => rollbackMutation.mutate({ actionIndex }),
    [rollbackMutation],
  );

  const handleBonusAction = useCallback(
    (
      participantId: string,
      abilityKey: string,
      targetParticipantId?: string,
    ) => {
      bonusActionMutation.mutate({
        participantId,
        abilityKey,
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
