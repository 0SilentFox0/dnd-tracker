/**
 * Утиліти для розрахунку урону з урахуванням всіх модифікаторів
 */

import { calculatePercentBonus, formatFlatBonusBreakdown,formatPercentBonusBreakdown, matchesAttackType } from "./battle-modifiers-common";
import { getParticipantExtras } from "./battle-participant";
import { hasAnyAllyLowHp } from "./battle-participant-helpers";

import { AttackType } from "@/lib/constants/battle";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { BattleParticipant } from "@/types/battle";

/**
 * Результат розрахунку урону
 */
export interface DamageCalculationResult {
  baseDamage: number; // базовий урон з кубиків + модифікатор характеристики
  skillPercentBonus: number; // процентний бонус зі скілів
  skillFlatBonus: number; // flat бонус зі скілів
  artifactPercentBonus: number; // процентний бонус з артефактів
  artifactFlatBonus: number; // flat бонус з артефактів
  passiveAbilityBonus: number; // бонус з пасивних здібностей
  additionalDamage: Array<{
    type: string;
    value: number;
  }>; // додаткові типи урону (fire, poison, тощо)
  totalDamage: number; // фінальний урон
  breakdown: string[]; // детальний опис для відображення
}

/**
 * Розраховує процентні модифікатори урону зі скілів
 * Стакує процентні бонуси адитивно
 * @param attacker - атакуючий учасник
 * @param attackType - тип атаки (AttackType enum)
 * @returns сумарний процентний бонус
 */
export function calculateSkillDamagePercentBonus(
  attacker: BattleParticipant,
  attackType: AttackType
): number {
  let totalPercent = 0;

  for (const skill of attacker.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (effect.isPercentage && typeof effect.value === "number" && matchesAttackType(effect.stat, attackType)) {
        totalPercent += effect.value;
      }
    }
  }

  // Бонуси/дебафи з активних ефектів (заклинання: Weakness -40%, Righteous Might +40%)
  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const val = typeof d.value === "number" ? d.value : 0;

      const isPct = d.isPercentage === true;

      if (isPct && matchesAttackType(d.type ?? "", attackType)) {
        totalPercent += val;
      }
    }
  }

  return totalPercent;
}

/**
 * Розраховує flat модифікатори урону зі скілів
 * @param attacker - атакуючий учасник
 * @param attackType - тип атаки (AttackType enum)
 * @returns сумарний flat бонус
 */
export function calculateSkillDamageFlatBonus(
  attacker: BattleParticipant,
  attackType: AttackType
): number {
  let totalFlat = 0;

  for (const skill of attacker.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (!effect.isPercentage && typeof effect.value === "number" && matchesAttackType(effect.stat, attackType)) {
        totalFlat += effect.value;
      }
    }
  }

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const val = typeof d.value === "number" ? d.value : 0;

      if (d.isPercentage !== true && matchesAttackType(d.type ?? "", attackType)) {
        totalFlat += val;
      }
    }
  }

  return totalFlat;
}

/**
 * Розраховує бонуси урону з артефактів
 * @param attacker - атакуючий учасник
 * @param attackType - тип атаки (AttackType enum)
 * @returns об'єкт з процентними та flat бонусами
 */
export function calculateArtifactDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const artifact of attacker.battleData.equippedArtifacts) {
    for (const modifier of artifact.modifiers) {
      // Перевіряємо чи це модифікатор урону та чи відповідає типу атаки
      if (modifier.type.toLowerCase().includes("damage") && matchesAttackType(modifier.type, attackType)) {
        if (modifier.isPercentage) {
          percent += modifier.value;
        } else {
          flat += modifier.value;
        }
      }
    }
  }

  return { percent, flat };
}

/**
 * Розраховує бонус урону з пасивних здібностей (наприклад, Годрик +50% при союзнику <15% HP)
 * @param attacker - атакуючий учасник
 * @param context - контекст для перевірки умов
 * @returns бонус урону (0-1 для процентного, або flat значення)
 */
export function calculatePassiveAbilityDamageBonus(
  attacker: BattleParticipant,
  context?: {
    allParticipants?: BattleParticipant[];
    damage?: number;
  }
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const passive of attacker.battleData.passiveAbilities) {
    // Перевіряємо чи це модифікатор урону
    if (passive.effect.type === "modify_damage" || passive.effect.type === "damage_bonus") {
      // Перевіряємо тригер (наприклад, ally_low_hp)
      // Використовуємо налаштовуваний поріг з тригера або константу за замовчуванням
      if (passive.trigger.type === "ally_low_hp" && context?.allParticipants) {
        const threshold = passive.trigger.lowHpThresholdPercent ?? BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT;

        if (hasAnyAllyLowHp(attacker, context.allParticipants, threshold)) {
          // Умова виконана, застосовуємо бонус
          const value = passive.effect.value || 0;

          if (typeof value === "number") {
            // Якщо більше 1 і менше 100, це процентний бонус
            if (value > 1 && value < 100) {
              percent += value;
            } else if (value <= 1) {
              percent += value * 100; // Конвертуємо 0.5 в 50%
            } else {
              flat += value; // Якщо >= 100, це flat бонус
            }
          }
        }
      }
    }
  }

  return { percent, flat };
}

/**
 * Повний розрахунок урону з усіма модифікаторами
 * @param attacker - атакуючий учасник
 * @param baseDamage - базовий урон з кубиків (без модифікатора характеристики)
 * @param statModifier - модифікатор характеристики (STR для melee, DEX для ranged)
 * @param attackType - тип атаки
 * @param context - контекст для пасивних здібностей та опційно hero: level + кубики за рівнем (d6/d8)
 * @returns детальний результат розрахунку
 */
export function calculateDamageWithModifiers(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: {
    allParticipants?: BattleParticipant[];
    additionalDamage?: Array<{ type: string; value: number }>;
    /** Рівень героя (додається до бази) */
    heroLevelPart?: number;
    /** Середній урон з кубиків за рівнем (d6/d8) */
    heroDicePart?: number;
    /** Нотація кубиків для breakdown, напр. "3d8" */
    heroDiceNotation?: string;
    /** Нотація кубиків зброї для breakdown, напр. "1d6" (щоб не плутати з "Бонус зброї (артефакт)") */
    weaponDiceNotation?: string;
  }
): DamageCalculationResult {
  const breakdown: string[] = [];

  const heroLevelPart = context?.heroLevelPart ?? 0;

  const heroDicePart = context?.heroDicePart ?? 0;

  const heroDiceNotation = context?.heroDiceNotation;

  const weaponDiceNotation = context?.weaponDiceNotation;

  const statLabel = attackType === AttackType.MELEE ? "STR" : "DEX";

  // Базовий урон: кубики зброї + рівень + кубики за рівнем + модифікатор характеристики
  const baseWithStat = Math.max(
    BATTLE_CONSTANTS.MIN_DAMAGE,
    baseDamage + heroLevelPart + heroDicePart + statModifier
  );

  if (heroLevelPart > 0 || heroDicePart > 0) {
    const parts: string[] = [];

    // Чітко: це середній урон кубиків зброї (напр. 1d6), не "бонус артефакта"
    parts.push(
      weaponDiceNotation
        ? `${baseDamage} (${weaponDiceNotation})`
        : `${baseDamage} (кубики зброї)`
    );
    parts.push(`${heroLevelPart} (рівень)`);

    if (heroDiceNotation) parts.push(`${heroDicePart} (${heroDiceNotation})`);
    else if (heroDicePart > 0) parts.push(`${heroDicePart} (кубики за рівнем)`);

    parts.push(`${statModifier} (${statLabel})`);
    breakdown.push(`${parts.join(" + ")} = ${baseWithStat}`);
  } else {
    breakdown.push(
      `${baseDamage} (кубики) + ${statModifier} (${statLabel}) = ${baseWithStat}`
    );
  }

  // Процентні бонуси зі скілів
  const skillPercent = calculateSkillDamagePercentBonus(attacker, attackType);

  const skillPercentBreakdown = formatPercentBonusBreakdown("Бонуси зі скілів", skillPercent);

  if (skillPercentBreakdown) breakdown.push(skillPercentBreakdown);

  // Flat бонуси зі скілів
  const skillFlat = calculateSkillDamageFlatBonus(attacker, attackType);

  const skillFlatBreakdown = formatFlatBonusBreakdown("Flat бонус зі скілів", skillFlat);

  if (skillFlatBreakdown) breakdown.push(skillFlatBreakdown);

  // Бонуси з артефактів (зброя) — завжди виводимо, навіть якщо 0
  const artifactBonuses = calculateArtifactDamageBonus(attacker, attackType);

  const artifactPercentBreakdown = formatPercentBonusBreakdown("Бонус з артефактів", artifactBonuses.percent);

  if (artifactPercentBreakdown) breakdown.push(artifactPercentBreakdown);

  const artifactFlatBreakdown = formatFlatBonusBreakdown("Flat бонус з артефактів", artifactBonuses.flat);

  if (artifactFlatBreakdown) breakdown.push(artifactFlatBreakdown);

  if (!artifactPercentBreakdown && !artifactFlatBreakdown) {
    breakdown.push("Додатковий бонус зброї (артефакт): 0");
  }

  // Бонуси з пасивних здібностей
  const passiveBonuses = calculatePassiveAbilityDamageBonus(attacker, context);

  const passivePercentBreakdown = formatPercentBonusBreakdown("Бонус з пасивних здібностей", passiveBonuses.percent);

  if (passivePercentBreakdown) breakdown.push(passivePercentBreakdown);

  const passiveFlatBreakdown = formatFlatBonusBreakdown("Flat бонус з пасивок", passiveBonuses.flat);

  if (passiveFlatBreakdown) breakdown.push(passiveFlatBreakdown);

  // Загальний процентний бонус (стакується адитивно)
  const totalPercent = skillPercent + artifactBonuses.percent + passiveBonuses.percent;
  
  // Розраховуємо процентний бонус як додаток до baseWithStat
  const percentBonusDamage = calculatePercentBonus(baseWithStat, totalPercent);
  
  // Загальний flat бонус
  const totalFlat = skillFlat + artifactBonuses.flat + passiveBonuses.flat;

  // Фінальний урон (завжди ціле число)
  const totalDamage = Math.floor(baseWithStat + percentBonusDamage + totalFlat);

  breakdown.push(`──────────`);
  breakdown.push(`Всього: ${totalDamage} урону`);

  return {
    baseDamage: baseWithStat,
    skillPercentBonus: skillPercent,
    skillFlatBonus: skillFlat,
    artifactPercentBonus: artifactBonuses.percent,
    artifactFlatBonus: artifactBonuses.flat,
    passiveAbilityBonus: passiveBonuses.percent + passiveBonuses.flat,
    additionalDamage: context?.additionalDamage || [],
    totalDamage,
    breakdown,
  };
}

/**
 * Застосовує резист до вхідного урону.
 * @param damage - вхідний урон
 * @param defender - захисник
 * @param damageCategory - "physical" | "spell" (тип урону для вибору резисту)
 * @returns об'єкт з фінальним уроном та інформацією про зменшення
 */
export function applyResistance(
  damage: number,
  defender: BattleParticipant,
  damageCategory: "physical" | "spell" = "physical",
): { finalDamage: number; resistPercent: number; resistMessage: string | null } {
  const extras = getParticipantExtras(defender);

  const resistances = extras.resistances;

  if (!resistances) return { finalDamage: damage, resistPercent: 0, resistMessage: null };

  let resistPercent = 0;

  if (damageCategory === "physical") {
    resistPercent = resistances.physical ?? 0;
  } else if (damageCategory === "spell") {
    resistPercent = resistances.spell ?? 0;
  }

  if (resistPercent <= 0) return { finalDamage: damage, resistPercent: 0, resistMessage: null };

  const reduction = Math.floor(damage * (resistPercent / 100));

  const finalDamage = Math.max(0, damage - reduction);

  const resistMessage = `🛡 ${defender.basicInfo.name}: ${resistPercent}% резист (−${reduction} урону)`;

  return { finalDamage, resistPercent, resistMessage };
}
