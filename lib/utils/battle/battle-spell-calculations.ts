/**
 * Утиліти для розрахунку заклинання з урахуванням покращень
 */

import { calculatePercentBonus } from "./battle-modifiers-common";

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
  baseDamage: number; // базовий урон з кубиків заклинання
  spellEffectIncrease: number; // процентне збільшення ефекту (наприклад, +25%)
  additionalModifierDamage: number; // додатковий урон з spellAdditionalModifier
  totalDamage: number; // фінальний урон
  breakdown: string[]; // детальний опис
  targetChange?: { target: string }; // зміна цілі (якщо є)
  hasAdditionalModifier: boolean; // чи є додатковий модифікатор (burning, poison, тощо)
}

/**
 * Знаходить активні скіли з покращеннями заклинання (magic/spell).
 * @param participant - учасник бою (кастер)
 * @returns масив скілів з spellEnhancements, що підходять для магії
 */
export function getSpellEnhancementSkills(
  participant: BattleParticipant,
): ActiveSkill[] {
  return participant.battleData.activeSkills.filter((skill) => {
    if (!skill.spellEnhancements) return false;

    // Якщо скіл позначено «впливає на шкоду», враховуємо лише для типу magic
    if (skill.affectsDamage === true && skill.damageType !== "magic")
      return false;

    return true;
  });
}

/**
 * Скіли з покращеннями заклинання — по одному на лінію (mainSkillId), лише найвищий рівень.
 * Аналогічно до melee/ranged: Магія Вогню Базовий/Просунутий/Експерт → лише Експерт.
 */
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

/**
 * Розраховує процентне збільшення ефекту заклинання.
 * Враховує лише найвищий рівень скіла на лінію (наприклад, лише Магія Вогню — Експерт).
 * @param participant - кастер
 * @returns сумарний процентний бонус
 */
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

/**
 * Перевіряє чи є зміна цілі для заклинання (з найвищого скіла на лінію).
 * @param participant - кастер
 * @returns зміна цілі або undefined
 */
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

/**
 * Розраховує додатковий урон з spellAdditionalModifier (лише з найвищого скіла на лінію).
 * @param participant - кастер
 * @param rollResult - результат кидка додаткових кубиків (якщо є)
 * @returns додатковий урон та інформація про модифікатор
 */
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

      // Якщо є damageDice та rollResult, додаємо урон
      let damage = 0;

      if (modifier.damageDice && rollResult !== undefined) {
        damage = rollResult;
      }

      return {
        damage,
        modifier: modifier.modifier, // "burning", "poison", тощо
        damageDice: modifier.damageDice,
        duration: modifier.duration,
      };
    }
  }

  return { damage: 0 };
}

/**
 * Повний розрахунок урону заклинання з усіма покращеннями
 * @param participant - кастер
 * @param spellId - ID заклинання
 * @param baseDamage - базовий урон з кубиків заклинання
 * @param additionalRollResult - результат кидка додаткових кубиків (якщо є)
 * @returns детальний результат розрахунку
 */
export function calculateSpellDamageWithEnhancements(
  participant: BattleParticipant,
  baseDamage: number,
  additionalRollResult?: number,
): SpellCalculationResult {
  const breakdown: string[] = [];

  breakdown.push(`${baseDamage} (базовий урон заклинання)`);

  // Процентне збільшення ефекту
  const effectIncrease = calculateSpellEffectIncrease(participant);

  const increaseDamage = calculatePercentBonus(baseDamage, effectIncrease);

  if (effectIncrease > 0) {
    breakdown.push(`+${effectIncrease}% ефекту (+${increaseDamage})`);
  }

  // Додаємо додаткові модифікатори (burning, poison, тощо)
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

  // Фінальний урон
  const totalDamage = baseDamage + increaseDamage + additionalDamage;

  breakdown.push(`──────────`);
  breakdown.push(`Всього: ${totalDamage} урону`);

  // Зміна цілі
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
