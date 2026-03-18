/**
 * Утиліти для розрахунку заклинання з урахуванням покращень
 */

import { calculatePercentBonus } from "../common";

import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

/** Ранг рівня скіла для порівняння (більший = вищий рівень) */
const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/**
 * Результат розрахунку урону/ефекту заклинання
 */
export interface SpellCalculationResult {
  baseDamage: number;
  spellEffectIncrease: number;
  additionalModifierDamage: number;
  totalDamage: number;
  breakdown: string[];
  targetChange?: { target: string };
  hasAdditionalModifier: boolean;
}

export function getSpellEnhancementSkills(
  participant: BattleParticipant,
): ActiveSkill[] {
  return participant.battleData.activeSkills.filter((skill) => {
    if (!skill.spellEnhancements) return false;

    if (skill.affectsDamage === true && skill.damageType !== "magic")
      return false;

    return true;
  });
}

function getSpellEnhancementSkillsHighestOnly(
  participant: BattleParticipant,
): ActiveSkill[] {
  const applicable = getSpellEnhancementSkills(participant);

  const byMainSkill = new Map<string, ActiveSkill>();

  for (const skill of applicable) {
    const key = skill.mainSkillId || skill.skillId;

    const existing = byMainSkill.get(key);

    const rankNew = SKILL_LEVEL_RANK[skill.level ?? SkillLevel.BASIC] ?? 1;

    const rankExisting = existing
      ? (SKILL_LEVEL_RANK[existing.level ?? SkillLevel.BASIC] ?? 1)
      : 0;

    if (!existing || rankNew > rankExisting) {
      byMainSkill.set(key, skill);
    }
  }

  return Array.from(byMainSkill.values());
}

export function calculateSpellEffectIncrease(
  participant: BattleParticipant,
): number {
  let totalIncrease = 0;

  const enhancementSkills = getSpellEnhancementSkillsHighestOnly(participant);

  for (const skill of enhancementSkills) {
    if (skill.spellEnhancements?.spellEffectIncrease) {
      totalIncrease += skill.spellEnhancements.spellEffectIncrease;
    }
  }

  return totalIncrease;
}

export function getSpellTargetChange(
  participant: BattleParticipant,
): { target: string } | undefined {
  const enhancementSkills = getSpellEnhancementSkillsHighestOnly(participant);

  for (const skill of enhancementSkills) {
    if (skill.spellEnhancements?.spellTargetChange) {
      return skill.spellEnhancements.spellTargetChange;
    }
  }

  return undefined;
}

export function calculateSpellAdditionalModifier(
  participant: BattleParticipant,
  rollResult?: number,
): {
  damage: number;
  modifier?: string;
  damageDice?: string;
  duration?: number;
} {
  const enhancementSkills = getSpellEnhancementSkillsHighestOnly(participant);

  for (const skill of enhancementSkills) {
    if (skill.spellEnhancements?.spellAdditionalModifier) {
      const modifier = skill.spellEnhancements.spellAdditionalModifier;

      let damage = 0;

      if (modifier.damageDice && rollResult !== undefined) {
        damage = rollResult;
      }

      return {
        damage,
        modifier: modifier.modifier,
        damageDice: modifier.damageDice,
        duration: modifier.duration,
      };
    }
  }

  return { damage: 0 };
}

export function calculateSpellDamageWithEnhancements(
  participant: BattleParticipant,
  baseDamage: number,
  additionalRollResult?: number,
): SpellCalculationResult {
  const breakdown: string[] = [];

  breakdown.push(`${baseDamage} (базовий урон заклинання)`);

  const effectIncrease = calculateSpellEffectIncrease(participant);

  const increaseDamage = calculatePercentBonus(baseDamage, effectIncrease);

  if (effectIncrease > 0) {
    breakdown.push(`+${effectIncrease}% ефекту (+${increaseDamage})`);
  }

  const additionalModifier = calculateSpellAdditionalModifier(
    participant,
    additionalRollResult,
  );

  const additionalDamage = additionalModifier.damage || 0;

  if (additionalDamage > 0) {
    breakdown.push(
      `+${additionalDamage} (${additionalModifier.modifier || "додатковий урон"})`,
    );
  }

  const totalDamage = baseDamage + increaseDamage + additionalDamage;

  breakdown.push(`──────────`);
  breakdown.push(`Всього: ${totalDamage} урону`);

  const targetChange = getSpellTargetChange(participant);

  return {
    baseDamage,
    spellEffectIncrease: effectIncrease,
    additionalModifierDamage: additionalDamage,
    totalDamage,
    breakdown,
    targetChange,
    hasAdditionalModifier: !!additionalModifier.modifier,
  };
}
