/**
 * Утиліти для розрахунку урону з урахуванням всіх модифікаторів
 */

import {
  calculatePercentBonus,
  formatFlatBonusBreakdown,
  formatPercentBonusBreakdown,
  matchesAttackType,
} from "./battle-modifiers-common";
import { getParticipantExtras } from "./battle-participant";
import { hasAnyAllyLowHp } from "./battle-participant-helpers";
import { measureTiming } from "./battle-timing";

import { AttackType } from "@/lib/constants/battle";
import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

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
 * Розраховує процентні модифікатори урону зі скілів (вкачані скіли з дерева скілів).
 * Використовує attacker.battleData.activeSkills — скіли з ефектами melee_damage/ranged_damage.
 * Стакує процентні бонуси адитивно.
 * @param attacker - атакуючий учасник (має містити activeSkills з effects)
 * @param attackType - тип атаки (AttackType enum)
 * @returns сумарний процентний бонус
 */
/** Враховувати скіл для цього типу шкоди (melee/ranged): якщо позначено «впливає на шкоду», перевіряємо damageType */
function skillAppliesToDamageType(
  skill: { affectsDamage?: boolean; damageType?: string | null },
  attackType: AttackType,
): boolean {
  if (!skill.affectsDamage) return true;

  if (skill.damageType == null || skill.damageType === "") return true;

  const damageKind = attackType === AttackType.MELEE ? "melee" : "ranged";

  return skill.damageType === damageKind;
}

/** Ранг рівня скіла для порівняння (більший = вищий рівень) */
const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/**
 * Повертає скіли, що впливають на урон для даного типу атаки, по одному на лінію (mainSkillId) — лише найвищий рівень.
 * Наприклад, Стрільба Базовий/Просунутий/Експерт → лише Стрільба — Експерт.
 */
function getSkillsForDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): ActiveSkill[] {
  const applicable = attacker.battleData.activeSkills.filter((s) =>
    skillAppliesToDamageType(s, attackType),
  );

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

export function calculateSkillDamagePercentBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): number {
  let totalPercent = 0;

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (isPct && numVal !== 0 && matchesAttackType(effect.stat, attackType)) {
        totalPercent += numVal;
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
  attackType: AttackType,
): number {
  let totalFlat = 0;

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (
        !isPct &&
        numVal !== 0 &&
        matchesAttackType(effect.stat, attackType)
      ) {
        totalFlat += numVal;
      }
    }
  }

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const val = typeof d.value === "number" ? d.value : 0;

      if (
        d.isPercentage !== true &&
        matchesAttackType(d.type ?? "", attackType)
      ) {
        totalFlat += val;
      }
    }
  }

  return totalFlat;
}

/** Елемент breakdown для процентного бонусу зі скіла (назва + відсоток); лише найвищий рівень на лінію. */
export function getSkillDamagePercentBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType,
): Array<{ name: string; percent: number }> {
  const entries: Array<{ name: string; percent: number }> = [];

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    let percent = 0;

    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (isPct && numVal !== 0 && matchesAttackType(effect.stat, attackType)) {
        percent += numVal;
      }
    }

    if (percent !== 0) {
      entries.push({ name: skill.name || "Скіл", percent });
    }
  }

  return entries;
}

/** Елемент breakdown для flat бонусу зі скіла (назва + значення); лише найвищий рівень на лінію. */
export function getSkillDamageFlatBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType,
): Array<{ name: string; flat: number }> {
  const entries: Array<{ name: string; flat: number }> = [];

  const skills = getSkillsForDamageBonus(attacker, attackType);

  for (const skill of skills) {
    let flat = 0;

    for (const effect of skill.effects) {
      const isPct = effect.isPercentage === true;

      const numVal =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (
        !isPct &&
        numVal !== 0 &&
        matchesAttackType(effect.stat, attackType)
      ) {
        flat += numVal;
      }
    }

    if (flat !== 0) {
      entries.push({ name: skill.name || "Скіл", flat });
    }
  }

  return entries;
}

/**
 * Розраховує бонуси урону з артефактів
 * @param attacker - атакуючий учасник
 * @param attackType - тип атаки (AttackType enum)
 * @returns об'єкт з процентними та flat бонусами
 */
export function calculateArtifactDamageBonus(
  attacker: BattleParticipant,
  attackType: AttackType,
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const artifact of attacker.battleData.equippedArtifacts) {
    for (const modifier of artifact.modifiers) {
      // Перевіряємо чи це модифікатор урону та чи відповідає типу атаки
      if (
        modifier.type.toLowerCase().includes("damage") &&
        matchesAttackType(modifier.type, attackType)
      ) {
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
  },
): { percent: number; flat: number } {
  let percent = 0;

  let flat = 0;

  for (const passive of attacker.battleData.passiveAbilities) {
    // Перевіряємо чи це модифікатор урону
    if (
      passive.effect.type === "modify_damage" ||
      passive.effect.type === "damage_bonus"
    ) {
      // Перевіряємо тригер (наприклад, ally_low_hp)
      // Використовуємо налаштовуваний поріг з тригера або константу за замовчуванням
      if (passive.trigger.type === "ally_low_hp" && context?.allParticipants) {
        const threshold =
          passive.trigger.lowHpThresholdPercent ??
          BATTLE_CONSTANTS.DEFAULT_LOW_HP_THRESHOLD_PERCENT;

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
  },
): DamageCalculationResult {
  return measureTiming(
    "calculateDamageWithModifiers",
    () =>
      calculateDamageWithModifiersImpl(
        attacker,
        baseDamage,
        statModifier,
        attackType,
        context,
      ),
    { attackType },
  );
}

function calculateDamageWithModifiersImpl(
  attacker: BattleParticipant,
  baseDamage: number,
  statModifier: number,
  attackType: AttackType,
  context?: {
    allParticipants?: BattleParticipant[];
    additionalDamage?: Array<{ type: string; value: number }>;
    heroLevelPart?: number;
    heroDicePart?: number;
    heroDiceNotation?: string;
    weaponDiceNotation?: string;
  },
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
    baseDamage + heroLevelPart + heroDicePart + statModifier,
  );

  breakdown.push(`Сума кубиків: ${baseDamage}`);

  if (heroLevelPart > 0 || heroDicePart > 0) {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);

    const levelAndDice = heroLevelPart + heroDicePart;

    const levelLabel =
      heroDicePart > 0 && heroDiceNotation
        ? `рівень + кубики за рівнем (${heroDiceNotation})`
        : heroDicePart > 0
          ? "рівень + кубики за рівнем"
          : "рівень";

    breakdown.push(`+ ${levelAndDice} (${levelLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  } else {
    breakdown.push(`+ бонус ${statModifier} (${statLabel})`);
    breakdown.push(`= ${baseWithStat} (база)`);
  }

  const skillPercent = calculateSkillDamagePercentBonus(attacker, attackType);

  const hasApplicableSkills =
    getSkillsForDamageBonus(attacker, attackType).length > 0;

  // Логування для діагностики: які скіли вкачано та чому бонус може бути 0
  const activeSkills = attacker.battleData?.activeSkills ?? [];

  if (activeSkills.length > 0) {
    const attackTypeStr = attackType === AttackType.MELEE ? "melee" : "ranged";

    console.info(
      "[calculateDamageWithModifiers] Атакуючий:",
      attacker.basicInfo.name,
      "тип атаки:",
      attackTypeStr,
    );

    for (const s of activeSkills) {
      const applies = skillAppliesToDamageType(s, attackType);

      const effectsSummary = (s.effects ?? []).map((e) => ({
        stat: e.stat,
        value: e.value,
        isPercentage: e.isPercentage,
        matchesType: matchesAttackType(e.stat, attackType),
      }));

      console.info(
        "  скіл:",
        s.name,
        "| appliesToDamageType:",
        applies,
        "| damageType скіла:",
        s.damageType ?? "—",
        "| ефекти:",
        effectsSummary,
      );
    }
  }

  const skillPercentEntries = getSkillDamagePercentBreakdownEntries(
    attacker,
    attackType,
  );

  if (skillPercentEntries.length > 0) {
    for (const e of skillPercentEntries) {
      breakdown.push(`Бонус зі скілів: +${e.percent}% (${e.name})`);
    }
  } else if (hasApplicableSkills) {
    breakdown.push("Бонус зі скілів: +0%");
  }

  const skillFlat = calculateSkillDamageFlatBonus(attacker, attackType);

  const skillFlatEntries = getSkillDamageFlatBreakdownEntries(
    attacker,
    attackType,
  );

  if (skillFlatEntries.length > 0) {
    for (const e of skillFlatEntries) {
      breakdown.push(`Flat бонус зі скілів: +${e.flat} (${e.name})`);
    }
  } else if (hasApplicableSkills) {
    breakdown.push("Flat бонус зі скілів: +0");
  }

  const artifactBonuses = calculateArtifactDamageBonus(attacker, attackType);

  if (artifactBonuses.percent > 0) {
    breakdown.push(`Бонус артефакту: +${artifactBonuses.percent}%`);
  }

  if (artifactBonuses.flat > 0) {
    breakdown.push(`Бонус артефакту: +${artifactBonuses.flat}`);
  }

  if (artifactBonuses.percent === 0 && artifactBonuses.flat === 0) {
    breakdown.push("Бонус артефакту: 0");
  }

  // Бонуси з пасивних здібностей
  const passiveBonuses = calculatePassiveAbilityDamageBonus(attacker, context);

  const passivePercentBreakdown = formatPercentBonusBreakdown(
    "Бонус з пасивних здібностей",
    passiveBonuses.percent,
  );

  if (passivePercentBreakdown) breakdown.push(passivePercentBreakdown);

  const passiveFlatBreakdown = formatFlatBonusBreakdown(
    "Flat бонус з пасивок",
    passiveBonuses.flat,
  );

  if (passiveFlatBreakdown) breakdown.push(passiveFlatBreakdown);

  // Загальний процентний бонус (стакується адитивно)
  const totalPercent =
    skillPercent + artifactBonuses.percent + passiveBonuses.percent;

  // Розраховуємо процентний бонус як додаток до baseWithStat
  const percentBonusDamage = calculatePercentBonus(baseWithStat, totalPercent);

  // Загальний flat бонус
  const totalFlat = skillFlat + artifactBonuses.flat + passiveBonuses.flat;

  const totalBeforeFloor = baseWithStat + percentBonusDamage + totalFlat;

  const totalDamage = Math.floor(totalBeforeFloor);

  breakdown.push(`──────────`);
  breakdown.push(`Сума ${totalBeforeFloor.toFixed(1)} = ${totalDamage} шкоди`);

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
): {
  finalDamage: number;
  resistPercent: number;
  resistMessage: string | null;
} {
  const extras = getParticipantExtras(defender);

  const resistances = extras.resistances;

  if (!resistances)
    return { finalDamage: damage, resistPercent: 0, resistMessage: null };

  let resistPercent = 0;

  if (damageCategory === "physical") {
    resistPercent = resistances.physical ?? 0;
  } else if (damageCategory === "spell") {
    resistPercent = resistances.spell ?? 0;
  }

  if (resistPercent <= 0)
    return { finalDamage: damage, resistPercent: 0, resistMessage: null };

  const reduction = Math.floor(damage * (resistPercent / 100));

  const finalDamage = Math.max(0, damage - reduction);

  const resistMessage = `🛡 ${defender.basicInfo.name}: ${resistPercent}% резист (−${reduction} урону)`;

  return { finalDamage, resistPercent, resistMessage };
}
