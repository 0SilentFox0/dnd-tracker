/**
 * Повна обробка атаки з усіма модифікаторами та ефектами
 */

import {
  applyMainActionUsed,
  getEffectiveArmorClass,
} from "../../participant";
import {
  checkTriggerCondition,
  getPassiveAbilitiesByTrigger,
} from "../../triggers";
import type {
  ProcessAttackParams,
  ProcessAttackResult,
} from "../../types/attack-process";
import { calculateAttackRoll } from "..";
import { buildBattleActionForHit } from "./actions";
import { computeHitDamage } from "./compute";
import { handleCriticalFail } from "./critical-fail";
import { applyDamageToTarget } from "./damage";
import {
  applyOnHit,
  applyOnKillIfDead,
  applyReaction,
  applyVampirism,
} from "./hit-effects";
import { handleMiss } from "./miss";

import { ParticipantSide } from "@/lib/constants/battle";
import { executeAfterAttackTriggers, executeBeforeAttackTriggers } from "@/lib/utils/skills/execution";

export type { ProcessAttackParams, ProcessAttackResult };

/**
 * Повна обробка атаки
 */
export function processAttack(params: ProcessAttackParams): ProcessAttackResult {
  const {
    attacker,
    target,
    attack,
    d20Roll,
    advantageRoll,
    disadvantageRoll,
    damageRolls,
    allParticipants,
    currentRound,
    battleId,
    damageMultiplier,
  } = params;

  let updatedAttacker = { ...attacker };

  let updatedTarget = { ...target };

  const isOwnerAction = attacker.basicInfo.side === ParticipantSide.ALLY;

  const beforeAttackResult = executeBeforeAttackTriggers(
    updatedAttacker,
    updatedTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedAttacker = beforeAttackResult.updatedAttacker;

  const attackRoll = calculateAttackRoll(
    updatedAttacker,
    attack,
    d20Roll,
    advantageRoll,
    disadvantageRoll,
  );

  const targetAC = getEffectiveArmorClass(updatedTarget);

  const isHit =
    !attackRoll.isCriticalFail &&
    (attackRoll.isCritical || attackRoll.totalAttackValue >= targetAC);

  if (attackRoll.isCriticalFail && attackRoll.criticalEffect) {
    return handleCriticalFail({
      attacker: updatedAttacker,
      target: updatedTarget,
      attack,
      d20Roll,
      attackRoll,
      targetAC,
      allParticipants,
      currentRound,
      battleId,
      beforeMessages: beforeAttackResult.messages,
    });
  }

  if (!isHit) {
    return handleMiss({
      attacker: updatedAttacker,
      target: updatedTarget,
      attack,
      d20Roll,
      attackRoll,
      targetAC,
      allParticipants,
      currentRound,
      battleId,
      beforeMessages: beforeAttackResult.messages,
    });
  }

  const hitDamage = computeHitDamage({
    attacker: updatedAttacker,
    target: updatedTarget,
    attack,
    damageRolls,
    allParticipants,
    attackRoll,
    damageMultiplier,
    currentRound,
  });

  updatedAttacker = hitDamage.updatedAttacker;
  updatedTarget = hitDamage.updatedTarget;

  const {
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    additionalDamageBreakdown,
    criticalEffectApplied,
    oldHp,
  } = hitDamage;

  const attackerSkillUsageCounts: Record<string, number> = {
    ...(updatedAttacker.battleData.skillUsageCounts ?? {}),
  };

  const targetSkillUsageCounts: Record<string, number> = {
    ...(updatedTarget.battleData.skillUsageCounts ?? {}),
  };

  const damageApplyResult = applyDamageToTarget(
    updatedTarget,
    totalFinalDamage,
    targetSkillUsageCounts,
  );

  updatedTarget = damageApplyResult.updatedTarget;

  const targetWasAlive = target.combatStats.currentHp > 0;

  const targetIsDead =
    updatedTarget.combatStats.status === "dead" ||
    updatedTarget.combatStats.status === "unconscious";

  updatedAttacker = applyOnKillIfDead(
    updatedAttacker,
    targetWasAlive,
    targetIsDead,
    attackerSkillUsageCounts,
  );

  const onHitResult = applyOnHit(
    updatedAttacker,
    updatedTarget,
    currentRound,
    attackerSkillUsageCounts,
    resistanceResult.finalDamage,
    allParticipants,
    attack.id ?? "",
    attack.name ?? "",
  );

  updatedTarget = onHitResult.updatedTarget;
  updatedAttacker = onHitResult.updatedAttacker;

  const allParticipantsUpdated = onHitResult.updatedParticipants;

  const vampirismResult = applyVampirism(
    updatedAttacker,
    totalFinalDamage,
    attack.type,
  );

  updatedAttacker = vampirismResult.updatedAttacker;

  const vampirismHeal = vampirismResult.vampirismHeal;

  updatedAttacker = {
    ...updatedAttacker,
    battleData: {
      ...updatedAttacker.battleData,
      skillUsageCounts: attackerSkillUsageCounts,
    },
  };
  updatedTarget = {
    ...updatedTarget,
    battleData: {
      ...updatedTarget.battleData,
      skillUsageCounts: targetSkillUsageCounts,
    },
  };

  const onHitAbilities = getPassiveAbilitiesByTrigger(updatedAttacker, "on_hit");

  for (const ability of onHitAbilities) {
    if (
      checkTriggerCondition(ability.trigger, updatedAttacker, {
        target: updatedTarget,
        allParticipants,
        damage: totalFinalDamage,
      })
    ) {
      // TODO: Реалізувати застосування ефектів
    }
  }

  const afterAttackResult = executeAfterAttackTriggers(
    updatedAttacker,
    updatedTarget,
    allParticipants,
    isOwnerAction,
  );

  updatedAttacker = afterAttackResult.updatedAttacker;

  const ignoreReactions = criticalEffectApplied?.effect.type === "ignore_reactions";

  const reactionResult = applyReaction(updatedTarget, updatedAttacker, !!ignoreReactions);

  updatedTarget = reactionResult.updatedDefender;
  updatedAttacker = reactionResult.updatedAttacker;

  updatedAttacker = applyMainActionUsed(updatedAttacker);

  const battleAction = buildBattleActionForHit({
    attacker: updatedAttacker,
    target: updatedTarget,
    attack,
    d20Roll,
    damageRolls,
    attackRoll,
    targetAC,
    damageCalculation,
    physicalDamage,
    totalFinalDamage,
    resistanceResult,
    criticalEffectApplied,
    beforeMessages: beforeAttackResult.messages,
    afterMessages: afterAttackResult.messages,
    vampirismHeal,
    reactionTriggered: reactionResult.reactionTriggered,
    reactionDamage: reactionResult.reactionDamage,
    reactionBaseDamage: reactionResult.reactionBaseDamage,
    reactionBonusPercent: reactionResult.reactionBonusPercent,
    reactionAttackerHpChange: reactionResult.reactionAttackerHpChange,
    oldHp,
    battleId,
    currentRound,
  });

  return {
    success: true,
    attackRoll,
    damage: {
      totalDamage: damageCalculation.totalDamage,
      finalDamage: totalFinalDamage,
      breakdown: damageCalculation.breakdown,
      resistanceBreakdown: resistanceResult.breakdown,
      additionalDamageBreakdown,
    },
    targetUpdated: updatedTarget,
    attackerUpdated: updatedAttacker,
    allParticipantsUpdated,
    criticalEffectApplied,
    reactionTriggered: reactionResult.reactionTriggered,
    reactionDamage: reactionResult.reactionDamage,
    battleAction,
  };
}
