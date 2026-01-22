/**
 * Утиліти для розрахунку заклинання з урахуванням покращень
 */

import { BattleParticipant, ActiveSkill } from "@/types/battle";
import { calculatePercentBonus } from "./battle-modifiers-common";

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
 * Знаходить всі активні скіли з покращеннями заклинання
 * @param participant - учасник бою (кастер)
 * @param spellId - ID заклинання
 * @returns масив скілів з покращеннями для цього заклинання
 */
export function getSpellEnhancementSkills(
  participant: BattleParticipant,
  spellId: string
): ActiveSkill[] {
  return participant.activeSkills.filter((skill) => {
    if (!skill.spellEnhancements) return false;

    // Перевіряємо чи скіл покращує це заклинання
    // Це може бути через spellNewSpellId або через spellGroupId
    // Поки що перевіряємо базову структуру
    return true; // TODO: Додати логіку перевірки конкретного spellId
  });
}

/**
 * Розраховує процентне збільшення ефекту заклинання
 * Стакує всі spellEffectIncrease адитивно
 * @param participant - кастер
 * @param spellId - ID заклинання
 * @returns сумарний процентний бонус
 */
export function calculateSpellEffectIncrease(
  participant: BattleParticipant,
  spellId: string
): number {
  let totalIncrease = 0;

  const enhancementSkills = getSpellEnhancementSkills(participant, spellId);

  for (const skill of enhancementSkills) {
    if (skill.spellEnhancements?.spellEffectIncrease) {
      totalIncrease += skill.spellEnhancements.spellEffectIncrease;
    }
  }

  return totalIncrease;
}

/**
 * Перевіряє чи є зміна цілі для заклинання
 * @param participant - кастер
 * @param spellId - ID заклинання
 * @returns зміна цілі або undefined
 */
export function getSpellTargetChange(
  participant: BattleParticipant,
  spellId: string
): { target: string } | undefined {
  const enhancementSkills = getSpellEnhancementSkills(participant, spellId);

  for (const skill of enhancementSkills) {
    if (skill.spellEnhancements?.spellTargetChange) {
      return skill.spellEnhancements.spellTargetChange;
    }
  }

  return undefined;
}

/**
 * Розраховує додатковий урон з spellAdditionalModifier
 * @param participant - кастер
 * @param spellId - ID заклинання
 * @param rollResult - результат кидка додаткових кубиків (якщо є)
 * @returns додатковий урон та інформація про модифікатор
 */
export function calculateSpellAdditionalModifier(
  participant: BattleParticipant,
  spellId: string,
  rollResult?: number
): {
  damage: number;
  modifier?: string;
  damageDice?: string;
  duration?: number;
} {
  const enhancementSkills = getSpellEnhancementSkills(participant, spellId);

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
  spellId: string,
  baseDamage: number,
  additionalRollResult?: number
): SpellCalculationResult {
  const breakdown: string[] = [];

  breakdown.push(`${baseDamage} (базовий урон заклинання)`);

  // Процентне збільшення ефекту
  const effectIncrease = calculateSpellEffectIncrease(participant, spellId);
  const increaseDamage = calculatePercentBonus(baseDamage, effectIncrease);
  if (effectIncrease > 0) {
    breakdown.push(`+${effectIncrease}% ефекту (+${increaseDamage})`);
  }

  // Додатковий модифікатор (burning, poison, тощо)
  const additionalModifier = calculateSpellAdditionalModifier(
    participant,
    spellId,
    additionalRollResult
  );
  const additionalDamage = additionalModifier.damage || 0;
  if (additionalDamage > 0) {
    breakdown.push(`+${additionalDamage} (${additionalModifier.modifier || "додатковий урон"})`);
  }

  // Фінальний урон
  const totalDamage = baseDamage + increaseDamage + additionalDamage;

  breakdown.push(`──────────`);
  breakdown.push(`Всього: ${totalDamage} урону`);

  // Зміна цілі
  const targetChange = getSpellTargetChange(participant, spellId);

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
