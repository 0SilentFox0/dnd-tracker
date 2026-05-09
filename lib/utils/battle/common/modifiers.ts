/**
 * Спільна логіка для розрахунку модифікаторів урону
 */

import { AttackType, BATTLE_CONSTANTS } from "@/lib/constants/battle";
import type { SkillDamageType } from "@/types/battle";

/**
 * Чи застосовується модифікатор «бонус до кидка атаки» до цього типу атаки.
 * `attack` / `attack_bonus` — на обидва типи; `ranged_attack` / `melee_attack` — вибірково.
 * Рядки з `disadvantage` ігноруються (не бонус до атаки).
 */
export function matchesAttackBonusModifier(
  modifierType: string,
  attackType: AttackType,
): boolean {
  const s = modifierType.toLowerCase();

  if (s.includes("disadvantage")) return false;

  if (!s.includes("attack")) return false;

  if (s.includes("ranged")) return attackType === AttackType.RANGED;

  if (s.includes("melee")) return attackType === AttackType.MELEE;

  return true;
}

/**
 * Перевіряє чи відповідає stat-ефекту скіла певному виду шкоди.
 *
 * Підтримує три види шкоди (`SkillDamageType`):
 *  - "melee"  — `melee_damage`, `physical_damage`, *_melee_*_damage, *_physical_*_damage
 *  - "ranged" — `ranged_damage`, `physical_damage`, *_ranged_*_damage, *_physical_*_damage
 *  - "magic"  — `spell_damage`, `magic_damage`, `*_spell_damage` (chaos_spell_damage, dark_spell_damage, тощо)
 *  - `all_damage` — універсально для всіх трьох видів.
 *
 * Параметр `attackType` приймається як `AttackType` enum (для legacy melee/ranged
 * викликів) або як `SkillDamageType` рядок (включно з "magic").
 */
export function matchesAttackType(
  effectStat: string,
  attackType: AttackType | SkillDamageType,
): boolean {
  const s = effectStat.toLowerCase();

  if (s === "all_damage") return true;

  if (attackType === "melee") {
    return (
      s === "melee_damage" ||
      s === "physical_damage" ||
      (s.includes("melee") && s.includes("damage")) ||
      (s.includes("physical") && s.includes("damage"))
    );
  }

  if (attackType === "ranged") {
    return (
      s === "ranged_damage" ||
      s === "physical_damage" ||
      (s.includes("ranged") && s.includes("damage")) ||
      (s.includes("physical") && s.includes("damage"))
    );
  }

  // magic
  return (
    s === "spell_damage" ||
    s === "magic_damage" ||
    s.endsWith("_spell_damage") ||
    (s.includes("magic") && s.includes("damage"))
  );
}

/**
 * Розраховує процентний бонус від базового значення
 * @param baseValue - базове значення
 * @param percentBonus - процентний бонус (наприклад, 25 для +25%)
 * @returns додаток до базового значення
 */
export function calculatePercentBonus(baseValue: number, percentBonus: number): number {
  if (percentBonus <= 0) return 0;

  return Math.floor(baseValue * (percentBonus / BATTLE_CONSTANTS.PERCENT_DIVISOR));
}

/**
 * Створює breakdown рядок для процентного бонусу
 * @param source - джерело бонусу (наприклад, "Бонуси зі скілів")
 * @param percent - процентний бонус
 * @returns breakdown рядок
 */
export function formatPercentBonusBreakdown(source: string, percent: number): string {
  if (percent <= 0) return "";

  return `${source}: +${percent}%`;
}

/**
 * Створює breakdown рядок для flat бонусу
 * @param source - джерело бонусу
 * @param flat - flat бонус
 * @returns breakdown рядок або порожній рядок якщо бонус = 0
 */
export function formatFlatBonusBreakdown(source: string, flat: number): string {
  if (flat <= 0) return "";

  return `${source}: +${flat}`;
}
