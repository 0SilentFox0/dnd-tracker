/**
 * Обробники кількох кроків атаки для useAttackFlow.
 */

import type { RollResultType } from "./useAttackFlow";

import { AttackType } from "@/lib/constants/battle";
import {
  getEffectiveD20,
  resolveAttackRoll,
} from "@/lib/utils/battle/common/attack-roll-helpers";
import type { AttackData } from "@/types/api";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export interface AttackRollData {
  attackRoll: number;
  advantageRoll?: number;
  disadvantageRoll?: number;
}

export interface UseAttackFlowHandlersParams {
  participant: BattleParticipant;
  selectedAttack: BattleAttack | null;
  selectedTarget: BattleParticipant | null;
  selectedTargets: BattleParticipant[];
  attackRollData: AttackRollData | null;
  attackRollsData: AttackRollData[];
  pendingAttackData: {
    damageRolls: number[];
    attackRollData: AttackRollData;
    attackRollsData?: AttackRollData[];
  } | null;
  rollResult: RollResultType | null;
  setAttackRollData: React.Dispatch<React.SetStateAction<AttackRollData | null>>;
  setAttackRollsData: React.Dispatch<React.SetStateAction<AttackRollData[]>>;
  setRollResult: React.Dispatch<React.SetStateAction<RollResultType | null>>;
  setPendingAttackData: React.Dispatch<
    React.SetStateAction<{
      damageRolls: number[];
      attackRollData: AttackRollData;
      attackRollsData?: AttackRollData[];
    } | null>
  >;
  setDamageFromCrit: (v: boolean) => void;
  setSelectedTarget: (t: BattleParticipant | null) => void;
  setAttackRollDialogOpen: (v: boolean) => void;
  setDamageRollDialogOpen: (v: boolean) => void;
  setDamageSummaryOpen: (v: boolean) => void;
  onAttack: (data: AttackData) => void;
  onAttackSuccess?: () => void;
  clearAttackState: () => void;
}

export function createAttackFlowHandlers({
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
}: UseAttackFlowHandlersParams) {
  const handleAttackRollConfirm = (data: AttackRollData) => {
    if (!selectedAttack || !selectedTarget) return;

    const attackBonus = selectedAttack.attackBonus || 0;

    const statModifier =
      selectedAttack.type === AttackType.MELEE
        ? Math.floor((participant.abilities.strength - 10) / 2)
        : Math.floor((participant.abilities.dexterity - 10) / 2);

    const totalBonus =
      attackBonus + statModifier + participant.abilities.proficiencyBonus;

    const targetAC = selectedTarget.combatStats.armorClass;

    const { hit, crit, critFail } = resolveAttackRoll(
      data,
      targetAC,
      totalBonus,
    );

    if (selectedTargets.length > 1) {
      setAttackRollsData((prev) => [...prev, data]);
      setAttackRollDialogOpen(false);
    } else {
      setAttackRollData(data);
      setAttackRollDialogOpen(false);
    }

    if (crit) setRollResult("crit");
    else if (critFail) setRollResult("crit_fail");
    else if (hit) setRollResult("hit");
    else setRollResult("miss");
  };

  const handleRollResultComplete = () => {
    if (!rollResult) return;

    const isHit = rollResult === "hit" || rollResult === "crit";

    const wasCrit = rollResult === "crit";

    setRollResult(null);

    const multiTarget = selectedTargets.length > 1;

    if (multiTarget) {
      const allRollsDone = attackRollsData.length >= selectedTargets.length;

      if (!allRollsDone) {
        setSelectedTarget(selectedTargets[attackRollsData.length]);
        setAttackRollDialogOpen(true);

        return;
      }

      const attackBonus = selectedAttack?.attackBonus || 0;

      const statModifier =
        selectedAttack?.type === AttackType.MELEE
          ? Math.floor((participant.abilities.strength - 10) / 2)
          : Math.floor((participant.abilities.dexterity - 10) / 2);

      const totalBonus =
        attackBonus + statModifier + participant.abilities.proficiencyBonus;

      const anyHit = attackRollsData.some((rollData, i) =>
        resolveAttackRoll(
          rollData,
          selectedTargets[i].combatStats.armorClass,
          totalBonus,
        ).hit,
      );

      if (anyHit) {
        setDamageFromCrit(false);
        setPendingAttackData({
          damageRolls: [],
          attackRollData: attackRollsData[0],
          attackRollsData,
        });
        setDamageRollDialogOpen(true);
      } else {
        if (!selectedAttack) return;

        onAttackSuccess?.();

        const effectiveRolls = attackRollsData.map((d) => getEffectiveD20(d));

        onAttack({
          attackerId: participant.basicInfo.id,
          targetIds: selectedTargets.map((t) => t.basicInfo.id),
          attackId: selectedAttack.id || selectedAttack.name,
          attackRolls: effectiveRolls,
          damageRolls: [],
        });
        clearAttackState();
      }

      return;
    }

    if (isHit) {
      setDamageFromCrit(wasCrit);
      setDamageRollDialogOpen(true);
    } else {
      if (!selectedAttack || selectedTargets.length === 0 || !attackRollData)
        return;

      onAttackSuccess?.();
      onAttack({
        attackerId: participant.basicInfo.id,
        targetIds: selectedTargets.map((t) => t.basicInfo.id),
        attackId: selectedAttack.id || selectedAttack.name,
        attackRoll: attackRollData.attackRoll,
        advantageRoll: attackRollData.advantageRoll,
        disadvantageRoll: attackRollData.disadvantageRoll,
        damageRolls: [],
      });
      clearAttackState();
    }
  };

  const handleDamageRollConfirm = (damageRolls: number[]) => {
    if (!selectedAttack || selectedTargets.length === 0) return;

    if (selectedTargets.length === 1 && !attackRollData) return;

    if (selectedTargets.length > 1 && attackRollsData.length > 0) {
      setPendingAttackData({
        damageRolls,
        attackRollData: attackRollsData[0],
        attackRollsData,
      });
    } else if (attackRollData) {
      setPendingAttackData({
        damageRolls,
        attackRollData,
      });
    }

    setDamageRollDialogOpen(false);
    setDamageSummaryOpen(true);
  };

  const handleDamageSummaryApply = () => {
    if (!selectedAttack || selectedTargets.length === 0 || !pendingAttackData)
      return;

    const multi = pendingAttackData.attackRollsData != null;

    if (!multi && !attackRollData) return;

    onAttackSuccess?.();

    const effectiveRolls =
      multi && pendingAttackData.attackRollsData
        ? pendingAttackData.attackRollsData.map((d) => getEffectiveD20(d))
        : undefined;

    const singleRoll =
      !multi && pendingAttackData.attackRollData
        ? pendingAttackData.attackRollData
        : null;

    onAttack({
      attackerId: participant.basicInfo.id,
      targetIds: selectedTargets.map((t) => t.basicInfo.id),
      attackId: selectedAttack.id || selectedAttack.name,
      ...(multi && effectiveRolls
        ? { attackRolls: effectiveRolls }
        : singleRoll
          ? {
              attackRoll: singleRoll.attackRoll,
              advantageRoll: singleRoll.advantageRoll,
              disadvantageRoll: singleRoll.disadvantageRoll,
            }
          : {}),
      damageRolls: pendingAttackData.damageRolls,
    });
    clearAttackState();
  };

  return {
    handleAttackRollConfirm,
    handleRollResultComplete,
    handleDamageRollConfirm,
    handleDamageSummaryApply,
  };
}
