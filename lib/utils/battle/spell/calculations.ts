/**
 * Утиліти для розрахунку заклинання з урахуванням покращень
 */

import { calculatePercentBonus } from "../common";
import { evaluateFormula } from "../common/formula-evaluator";

import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant, SkillEffect } from "@/types/battle";

/** Стат ефекту скіла, що застосовується до шкоди/ефекту заклинання */
const SPELL_DAMAGE_SKILL_STATS = new Set([
  "spell_damage",
  "dark_spell_damage",
  "chaos_spell_damage",
  "all_damage",
]);

/** Тип ефекту в activeEffects (бафи заклинань тощо) */
const SPELL_DAMAGE_BUFF_TYPES = new Set([
  "spell_damage",
  "dark_spell_damage",
  "chaos_spell_damage",
  "all_damage",
]);

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

function getSpellcastingModifier(participant: BattleParticipant): {
  mod: number;
  label: string;
} {
  const ability = participant.spellcasting?.spellcastingAbility;

  if (!ability) return { mod: 0, label: "" };

  const k = ability.toLowerCase();

  const m = participant.abilities.modifiers;

  if (k === "intelligence")
    return { mod: m.intelligence, label: "INT" };

  if (k === "wisdom") return { mod: m.wisdom, label: "WIS" };

  if (k === "charisma") return { mod: m.charisma, label: "CHA" };

  return { mod: 0, label: "" };
}

function formulaContextForSpell(participant: BattleParticipant): Record<
  string,
  number
> {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  return {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
    proficiency_bonus: participant.abilities.proficiencyBonus,
  };
}

function isPercentageEffect(effect: SkillEffect): boolean {
  const t = (effect.type || "").toLowerCase();

  return (
    effect.isPercentage === true ||
    t === "percent" ||
    t === "percentage"
  );
}

/** Плоскі та % бонуси з активних скілів (магія / усі типи, не лише melee/ranged). */
function aggregateMagicDamageFromActiveSkills(
  participant: BattleParticipant,
): { flat: number; percent: number; lines: string[] } {
  const lines: string[] = [];

  let flat = 0;

  let percent = 0;

  const ctx = formulaContextForSpell(participant);

  for (const skill of participant.battleData.activeSkills) {
    const dt = skill.damageType;

    if (dt === "melee" || dt === "ranged") continue;

    const label = skill.name || "Скіл";

    for (const effect of skill.effects ?? []) {
      const stat = (effect.stat || "").toLowerCase();

      if (!SPELL_DAMAGE_SKILL_STATS.has(stat)) continue;

      const typeStr = (effect.type || "flat").toLowerCase();

      if (typeStr === "formula" && typeof effect.value === "string") {
        const v = Math.floor(evaluateFormula(effect.value, ctx));

        if (v !== 0) {
          flat += v;

          lines.push(`${label}: ${v >= 0 ? "+" : ""}${v} (${stat}, формула)`);
        }

        continue;
      }

      const num =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (isPercentageEffect(effect)) {
        if (num !== 0) {
          percent += num;

          lines.push(`${label}: +${num}% (${stat})`);
        }
      } else if (num !== 0) {
        flat += num;

        lines.push(`${label}: ${num >= 0 ? "+" : ""}${num} (${stat})`);
      }
    }
  }

  return { flat, percent, lines };
}

/** Бафи з бою: activeEffects (наприклад після заклинань). */
function aggregateMagicDamageFromActiveEffects(
  participant: BattleParticipant,
): { flat: number; percent: number; lines: string[] } {
  const lines: string[] = [];

  let flat = 0;

  let percent = 0;

  for (const ae of participant.battleData.activeEffects ?? []) {
    const aeName = ae.name || "Ефект";

    for (const d of ae.effects ?? []) {
      const t = (d.type || "").toLowerCase();

      if (!SPELL_DAMAGE_BUFF_TYPES.has(t)) continue;

      const val = typeof d.value === "number" ? d.value : 0;

      if (d.isPercentage === true) {
        if (val !== 0) {
          percent += val;

          lines.push(`${aeName}: +${val}% (${t})`);
        }
      } else if (val !== 0) {
        flat += val;

        lines.push(`${aeName}: ${val >= 0 ? "+" : ""}${val} (${t})`);
      }
    }
  }

  return { flat, percent, lines };
}

export interface SpellDamageEnhancementOptions {
  /**
   * У калькуляторі шкоди на аркуші: після кубиків додається рівень героя.
   * У бою за замовчуванням вимкнено, щоб не змінювати баланс без узгодження.
   */
  addHeroLevelToBase?: boolean;
}

export function calculateSpellDamageWithEnhancements(
  participant: BattleParticipant,
  baseDamage: number,
  additionalRollResult?: number,
  options?: SpellDamageEnhancementOptions,
): SpellCalculationResult {
  const breakdown: string[] = [];

  let running = baseDamage;

  breakdown.push(`${baseDamage} (сума кубиків заклинання)`);

  if (options?.addHeroLevelToBase === true) {
    const heroLevel = participant.abilities.level;

    running += heroLevel;

    breakdown.push(`+${heroLevel} (рівень героя)`);
  }

  const { mod: spellMod, label: spellAbbr } = getSpellcastingModifier(
    participant,
  );

  if (spellMod !== 0 && spellAbbr) {
    running += spellMod;

    breakdown.push(
      `${spellMod >= 0 ? "+" : ""}${spellMod} (модифікатор ${spellAbbr})`,
    );
  }

  const fromSkills = aggregateMagicDamageFromActiveSkills(participant);

  if (fromSkills.flat !== 0) {
    running += fromSkills.flat;

    breakdown.push(...fromSkills.lines);
  }

  const fromBuffs = aggregateMagicDamageFromActiveEffects(participant);

  if (fromBuffs.flat !== 0) {
    running += fromBuffs.flat;

    breakdown.push(...fromBuffs.lines);
  }

  const effectIncrease = calculateSpellEffectIncrease(participant);

  const buffPercentTotal = fromSkills.percent + fromBuffs.percent;

  if (effectIncrease > 0 || buffPercentTotal > 0) {
    breakdown.push(`= ${running} (база перед %)`);
  }

  if (effectIncrease > 0) {
    const add = calculatePercentBonus(running, effectIncrease);

    running += add;

    breakdown.push(
      `+${effectIncrease}% баф до заклинання (школа магії) (+${add})`,
    );
  }

  if (buffPercentTotal > 0) {
    const add = calculatePercentBonus(running, buffPercentTotal);

    running += add;

    breakdown.push(
      `+${buffPercentTotal}% інші бафи (скіл/ефект на полі) (+${add})`,
    );
  }

  const additionalModifier = calculateSpellAdditionalModifier(
    participant,
    additionalRollResult,
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

  const targetChange = getSpellTargetChange(participant);

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
