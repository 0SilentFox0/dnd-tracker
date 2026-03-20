"use client";

import { useMemo, useState } from "react";

import { createAttackFlowHandlers } from "./useAttackFlow-handlers";

import { AttackType } from "@/lib/constants/battle";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import type { AttackData } from "@/types/api";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export type RollResultType =
  | "hit"
  | "miss"
  | "success"
  | "fail"
  | "crit"
  | "crit_fail";

export interface UseAttackFlowParams {
  participant: BattleParticipant;
  initiativeOrder: BattleParticipant[];
  onAttack: (data: AttackData) => void;
  onAttackSuccess?: () => void;
}

export function useAttackFlow({
  participant,
  initiativeOrder,
  onAttack,
  onAttackSuccess,
}: UseAttackFlowParams) {
  const [targetSelectionDialogOpen, setTargetSelectionDialogOpen] =
    useState(false);

  const [attackRollDialogOpen, setAttackRollDialogOpen] = useState(false);

  const [damageRollDialogOpen, setDamageRollDialogOpen] = useState(false);

  const [damageSummaryOpen, setDamageSummaryOpen] = useState(false);

  const [damageFromCrit, setDamageFromCrit] = useState(false);

  const [pendingAttackData, setPendingAttackData] = useState<{
    damageRolls: number[];
    attackRollData: {
      attackRoll: number;
      advantageRoll?: number;
      disadvantageRoll?: number;
    };
    attackRollsData?: Array<{
      attackRoll: number;
      advantageRoll?: number;
      disadvantageRoll?: number;
    }>;
    /** Індекси цілей, по яких було попадання (для multi-target — показуємо шкоду лише по ним) */
    hitTargetIndices?: number[];
  } | null>(null);

  const [attackRollsData, setAttackRollsData] = useState<
    Array<{
      attackRoll: number;
      advantageRoll?: number;
      disadvantageRoll?: number;
    }>
  >([]);

  const [selectedAttack, setSelectedAttack] = useState<BattleAttack | null>(
    null,
  );

  const [selectedTarget, setSelectedTarget] =
    useState<BattleParticipant | null>(null);

  const [selectedTargets, setSelectedTargets] = useState<BattleParticipant[]>(
    [],
  );

  const [attackRollData, setAttackRollData] = useState<{
    attackRoll: number;
    advantageRoll?: number;
    disadvantageRoll?: number;
  } | null>(null);

  const [rollResult, setRollResult] = useState<RollResultType | null>(null);

  const clearAttackState = () => {
    setSelectedAttack(null);
    setSelectedTarget(null);
    setSelectedTargets([]);
    setAttackRollData(null);
    setAttackRollsData([]);
    setPendingAttackData(null);
    setAttackRollDialogOpen(false);
    setDamageRollDialogOpen(false);
    setDamageSummaryOpen(false);
  };

  const currentRollTarget =
    selectedTargets.length > 1
      ? selectedTargets[attackRollsData.length]
      : selectedTarget;

  const handleMeleeAttack = () => {
    if (getDisabledAttackKinds(participant).melee) {
      alert("Ближні атаки заблоковані активним ефектом");

      return;
    }

    const attack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.MELEE || a.range === "5 ft",
    );

    if (attack) {
      setSelectedAttack(attack);
      setTargetSelectionDialogOpen(true);
    } else {
      alert("Немає доступної ближньої атаки");
    }
  };

  const handleRangedAttack = () => {
    if (getDisabledAttackKinds(participant).ranged) {
      alert("Дальні атаки заблоковані активним ефектом");

      return;
    }

    const attack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.RANGED || (a.range && a.range !== "5 ft"),
    );

    if (attack) {
      setSelectedAttack(attack);
      setTargetSelectionDialogOpen(true);
    } else {
      alert("Немає доступної дальньої атаки");
    }
  };

  const handleTargetSelect = (targetIds: string[]) => {
    if (targetIds.length === 0) return;

    const targets = targetIds
      .map((id) => initiativeOrder.find((p) => p.basicInfo.id === id))
      .filter((p): p is BattleParticipant => !!p);

    if (targets.length === 0) return;

    setSelectedTargets(targets);
    setSelectedTarget(targets[0]);
    setAttackRollsData([]);
    setTargetSelectionDialogOpen(false);
    setAttackRollDialogOpen(true);
  };

  const {
    handleAttackRollConfirm,
    handleRollResultComplete,
    handleDamageRollConfirm,
    handleDamageSummaryApply,
  } = useMemo(
    () =>
      createAttackFlowHandlers({
        participant,
        selectedAttack,
        selectedTarget,
        selectedTargets,
        attackRollData,
        attackRollsData,
        pendingAttackData,
        rollResult,
        setAttackRollData,
        setAttackRollsData,
        setRollResult,
        setPendingAttackData,
        setDamageFromCrit,
        setSelectedTarget,
        setAttackRollDialogOpen,
        setDamageRollDialogOpen,
        setDamageSummaryOpen,
        onAttack,
        onAttackSuccess,
        clearAttackState,
      }),
    [
      participant,
      selectedAttack,
      selectedTarget,
      selectedTargets,
      attackRollData,
      attackRollsData,
      pendingAttackData,
      rollResult,
      onAttack,
      onAttackSuccess,
    ],
  );

  return {
    dialogs: {
      targetSelection: {
        open: targetSelectionDialogOpen,
        setOpen: setTargetSelectionDialogOpen,
      },
      attackRoll: {
        open: attackRollDialogOpen,
        setOpen: setAttackRollDialogOpen,
      },
      damageRoll: {
        open: damageRollDialogOpen,
        setOpen: setDamageRollDialogOpen,
      },
      damageSummary: {
        open: damageSummaryOpen,
        setOpen: setDamageSummaryOpen,
      },
    },
    selection: {
      selectedAttack,
      selectedTarget,
      selectedTargets,
      currentRollTarget,
      attackRollData,
      attackRollsData,
      pendingAttackData,
      damageFromCrit,
    },
    rollResult,
    clearAttackState,
    handlers: {
      handleMeleeAttack,
      handleRangedAttack,
      handleTargetSelect,
      handleAttackRollConfirm,
      handleRollResultComplete,
      handleDamageRollConfirm,
      handleDamageSummaryApply,
    },
  };
}
