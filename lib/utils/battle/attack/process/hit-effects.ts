/**
 * Ефекти при попаданні: OnKill, OnHit, вампіризм, реакція (контр-удар)
 */

import {
  canPerformReaction,
  performReaction,
} from "..";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { AttackType } from "@/lib/constants/battle";
import {
  executeOnHitEffects,
  executeOnKillEffects,
} from "@/lib/utils/skills/execution";
import type { BattleParticipant } from "@/types/battle";

export interface ApplyReactionResult {
  updatedDefender: BattleParticipant;
  updatedAttacker: BattleParticipant;
  reactionTriggered: boolean;
  reactionDamage: number;
  reactionBaseDamage: number;
  reactionBonusPercent: number;
  reactionAttackerHpChange: { oldHp: number; newHp: number } | null;
}

/**
 * Перевіряє та виконує реакцію (контр-удар) і застосовує урон до атакуючого.
 */
export function applyReaction(
  defender: BattleParticipant,
  attacker: BattleParticipant,
  ignoreReactions: boolean,
): ApplyReactionResult {
  const result: ApplyReactionResult = {
    updatedDefender: defender,
    updatedAttacker: attacker,
    reactionTriggered: false,
    reactionDamage: 0,
    reactionBaseDamage: 0,
    reactionBonusPercent: 0,
    reactionAttackerHpChange: null,
  };

  if (ignoreReactions || !canPerformReaction(defender)) {
    return result;
  }

  const reactionResult = performReaction(defender, attacker);

  result.updatedDefender = reactionResult.updatedDefender;
  result.reactionTriggered = true;
  result.reactionDamage = reactionResult.damage;
  result.reactionBaseDamage = reactionResult.baseDamage;
  result.reactionBonusPercent = reactionResult.bonusPercent;

  let updatedAttacker = { ...attacker };

  const oldAttackerHp = updatedAttacker.combatStats.currentHp;

  let remainingReactionDamage = reactionResult.damage;

  if (updatedAttacker.combatStats.tempHp > 0 && remainingReactionDamage > 0) {
    const tempDamage = Math.min(
      updatedAttacker.combatStats.tempHp,
      remainingReactionDamage,
    );

    updatedAttacker = {
      ...updatedAttacker,
      combatStats: {
        ...updatedAttacker.combatStats,
        tempHp: updatedAttacker.combatStats.tempHp - tempDamage,
      },
    };
    remainingReactionDamage -= tempDamage;
  }

  const newHp = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    updatedAttacker.combatStats.currentHp - remainingReactionDamage,
  );

  updatedAttacker = {
    ...updatedAttacker,
    combatStats: {
      ...updatedAttacker.combatStats,
      currentHp: newHp,
      status: newHp <= 0 ? (newHp < 0 ? "dead" : "unconscious") : updatedAttacker.combatStats.status,
    },
  };

  result.updatedAttacker = updatedAttacker;
  result.reactionAttackerHpChange = { oldHp: oldAttackerHp, newHp };

  return result;
}

/**
 * Застосовує OnKill ефекти якщо ціль була вбита.
 */
export function applyOnKillIfDead(
  attacker: BattleParticipant,
  targetWasAlive: boolean,
  targetIsDead: boolean,
  attackerSkillUsageCounts: Record<string, number>,
): BattleParticipant {
  if (!targetWasAlive || !targetIsDead) {
    return attacker;
  }

  const onKillResult = executeOnKillEffects(attacker, attackerSkillUsageCounts);

  return onKillResult.updatedKiller;
}

/**
 * Застосовує OnHit ефекти та повертає оновлених учасників.
 */
export function applyOnHit(
  attacker: BattleParticipant,
  target: BattleParticipant,
  currentRound: number,
  attackerSkillUsageCounts: Record<string, number>,
  physicalDamageDealt: number,
  allParticipants: BattleParticipant[],
  attackId: string,
  attackName: string,
): {
  updatedTarget: BattleParticipant;
  updatedAttacker: BattleParticipant;
  updatedParticipants?: BattleParticipant[];
} {
  const onHitResult = executeOnHitEffects(
    attacker,
    target,
    currentRound,
    attackerSkillUsageCounts,
    physicalDamageDealt,
    allParticipants,
    attackId,
    attackName,
  );

  return {
    updatedTarget: onHitResult.updatedTarget,
    updatedAttacker: onHitResult.updatedAttacker,
    updatedParticipants: onHitResult.updatedParticipants,
  };
}

/**
 * Застосовує вампіризм: відновлення HP атакуючого від завданого урону.
 */
export function applyVampirism(
  attacker: BattleParticipant,
  totalFinalDamage: number,
  attackType: string,
): { updatedAttacker: BattleParticipant; vampirismHeal: number } {
  let vampirismHeal = 0;

  const isMeleeOrRanged =
    attackType === AttackType.MELEE || attackType === AttackType.RANGED;

  if (totalFinalDamage <= 0 || !isMeleeOrRanged) {
    return { updatedAttacker: attacker, vampirismHeal: 0 };
  }

  let vampirismPercent = 0;

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      if (d.type === "vampirism" && typeof d.value === "number") {
        vampirismPercent += d.isPercentage ? d.value : 0;
      }
    }
  }

  if (vampirismPercent > 0) {
    vampirismHeal = Math.floor((totalFinalDamage * vampirismPercent) / 100);

    if (vampirismHeal > 0) {
      const updatedAttacker = {
        ...attacker,
        combatStats: {
          ...attacker.combatStats,
          currentHp: Math.min(
            attacker.combatStats.maxHp,
            attacker.combatStats.currentHp + vampirismHeal,
          ),
        },
      };

      return { updatedAttacker, vampirismHeal };
    }
  }

  return { updatedAttacker: attacker, vampirismHeal: 0 };
}
