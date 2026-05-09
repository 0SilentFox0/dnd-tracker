/**
 * Утиліти для розрахунку шкоди заклинання.
 *
 * Magic damage використовує спільний з melee/ranged pipeline через
 * `calculateSkillDamage{Percent,Flat}Bonus(attacker, "magic", ctx)`. Magic-специфічні
 * механіки (spellEffectIncrease, додатковий модифікатор, targetChange,
 * spellcasting modifier) живуть тут і застосовуються поверх загального pipeline.
 */

import { calculatePercentBonus } from "../common";
import {
  calculateSkillDamageFlatBonus,
  calculateSkillDamagePercentBonus,
  getSkillDamageFlatBreakdownEntries,
  getSkillDamagePercentBreakdownEntries,
  type SkillDamageBonusContext,
} from "../damage/skill";
import { getSkillsForDamageBonus } from "../damage/skill-resolve";

import type { ActiveSkill, BattleParticipant } from "@/types/battle";

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

/**
 * Magic-скіли героя зі spellEnhancements (ціль: упгрейд заклинання),
 * відфільтровані по школі заклинання, лише найвищий рівень на mainSkillId.
 */
function getSpellEnhancementSkills(
  participant: BattleParticipant,
  ctx?: SkillDamageBonusContext,
): ActiveSkill[] {
  return getSkillsForDamageBonus(participant, "magic", ctx).filter(
    (s) => !!s.spellEnhancements,
  );
}

export function calculateSpellEffectIncrease(
  participant: BattleParticipant,
  ctx?: SkillDamageBonusContext,
): number {
  let totalIncrease = 0;

  for (const skill of getSpellEnhancementSkills(participant, ctx)) {
    if (skill.spellEnhancements?.spellEffectIncrease) {
      totalIncrease += skill.spellEnhancements.spellEffectIncrease;
    }
  }

  return totalIncrease;
}

export function getSpellTargetChange(
  participant: BattleParticipant,
  ctx?: SkillDamageBonusContext,
): { target: string } | undefined {
  for (const skill of getSpellEnhancementSkills(participant, ctx)) {
    if (skill.spellEnhancements?.spellTargetChange) {
      return skill.spellEnhancements.spellTargetChange;
    }
  }

  return undefined;
}

export function calculateSpellAdditionalModifier(
  participant: BattleParticipant,
  rollResult?: number,
  ctx?: SkillDamageBonusContext,
): {
  damage: number;
  modifier?: string;
  damageDice?: string;
  duration?: number;
} {
  for (const skill of getSpellEnhancementSkills(participant, ctx)) {
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

function getSpellcastingModifier(participant: BattleParticipant): {
  mod: number;
  label: string;
} {
  const ability = participant.spellcasting?.spellcastingAbility;

  if (!ability) return { mod: 0, label: "" };

  const k = ability.toLowerCase();

  const m = participant.abilities.modifiers;

  if (k === "intelligence") return { mod: m.intelligence, label: "INT" };

  if (k === "wisdom") return { mod: m.wisdom, label: "WIS" };

  if (k === "charisma") return { mod: m.charisma, label: "CHA" };

  return { mod: 0, label: "" };
}

export interface SpellDamageEnhancementOptions {
  /**
   * Додає рівень героя після кубиків. Зараз увімкнено і у калькуляторі,
   * і у бою (узгоджено з DM — magic damage scale аналогічно melee/ranged).
   * Прапорець залишається опційним для тестових сценаріїв.
   */
  addHeroLevelToBase?: boolean;
}

/**
 * Інформація про заклинання, потрібна для school-scope фільтра.
 * Передавайте `groupId` спела, щоб %-бонуси magic-скілів застосовувались
 * лише до заклинань відповідної школи (а не до всіх magic-заклинань підряд).
 * Якщо `groupId` невідомий — фільтр пропускає (фолбек).
 */
export interface SpellTarget {
  groupId?: string | null;
}

export function calculateSpellDamageWithEnhancements(
  participant: BattleParticipant,
  baseDamage: number,
  additionalRollResult?: number,
  options?: SpellDamageEnhancementOptions,
  spell?: SpellTarget,
): SpellCalculationResult {
  const ctx: SkillDamageBonusContext = { spellGroupId: spell?.groupId ?? null };

  const breakdown: string[] = [];

  let running = baseDamage;

  breakdown.push(`${baseDamage} (сума кубиків заклинання)`);

  if (options?.addHeroLevelToBase === true) {
    const heroLevel = participant.abilities.level;

    running += heroLevel;

    breakdown.push(`+${heroLevel} (рівень героя)`);
  }

  const { mod: spellMod, label: spellAbbr } = getSpellcastingModifier(participant);

  if (spellMod !== 0 && spellAbbr) {
    running += spellMod;

    breakdown.push(
      `${spellMod >= 0 ? "+" : ""}${spellMod} (модифікатор ${spellAbbr})`,
    );
  }

  // Flat bonuses зі скілів і активних ефектів (shared pipeline).
  const flatBonus = calculateSkillDamageFlatBonus(participant, "magic", ctx);

  const flatEntries = getSkillDamageFlatBreakdownEntries(participant, "magic", ctx);

  if (flatBonus !== 0) {
    running += flatBonus;
  }

  for (const e of flatEntries) {
    breakdown.push(`${e.name}: ${e.flat >= 0 ? "+" : ""}${e.flat}`);
  }

  const baseBeforePercent = running;

  // %-бонуси зі скілів і активних ефектів (shared pipeline) —
  // тут спрацьовує "Магія хаосу: експерт" → +25%.
  const percentBonus = calculateSkillDamagePercentBonus(participant, "magic", ctx);

  const percentEntries = getSkillDamagePercentBreakdownEntries(participant, "magic", ctx);

  if (percentBonus > 0 || percentEntries.length > 0) {
    breakdown.push(`= ${baseBeforePercent} (база перед %)`);
  }

  for (const e of percentEntries) {
    breakdown.push(`+${e.percent}% ${e.name}`);
  }

  if (percentBonus > 0) {
    const add = calculatePercentBonus(baseBeforePercent, percentBonus);

    running += add;

    breakdown.push(`+${percentBonus}% разом (+${add})`);
  }

  // Окрема magic-механіка: апгрейд ефекту заклинання (`Skill.spellEffectIncrease`).
  // Застосовується після %-бонусу зі скілів — як додаткова стадія.
  const effectIncrease = calculateSpellEffectIncrease(participant, ctx);

  if (effectIncrease > 0) {
    const add = calculatePercentBonus(running, effectIncrease);

    running += add;

    breakdown.push(
      `+${effectIncrease}% баф до заклинання (апгрейд) (+${add})`,
    );
  }

  const additionalModifier = calculateSpellAdditionalModifier(
    participant,
    additionalRollResult,
    ctx,
  );

  const additionalDamage = additionalModifier.damage || 0;

  if (additionalDamage > 0) {
    running += additionalDamage;

    breakdown.push(
      `+${additionalDamage} (${additionalModifier.modifier || "додатковий ефект"})`,
    );
  }

  breakdown.push(`──────────`);
  breakdown.push(`Всього: ${running} урону`);

  const targetChange = getSpellTargetChange(participant, ctx);

  return {
    baseDamage,
    spellEffectIncrease: effectIncrease,
    additionalModifierDamage: additionalDamage,
    totalDamage: running,
    breakdown,
    targetChange,
    hasAdditionalModifier: !!additionalModifier.modifier,
  };
}
