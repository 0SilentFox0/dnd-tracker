/**
 * Per-category handlers для executeSkillEffects (CODE_AUDIT 3.8).
 *
 * Раніше — один switch на 62 case у 163-рядковій функції.
 * Тепер — категоризація + 5 handler-ів:
 *  - formatDamageEffect       — damage stats (melee/ranged/spell/...)
 *  - formatResistanceEffect   — physical/spell/all_resistance
 *  - applyBuffDebuffEffect    — hp_bonus/armor/speed/initiative/morale (addActiveEffect)
 *  - applyDotEffect           — bleed/poison/burn/fire (addActiveEffect + dotDamage)
 *  - formatGenericEffect      — generic stats + default (push generic string)
 *
 * Майнова функція — `categorizeStat` визначає категорію для dispatch.
 */

import { parseDiceAverage } from "./helpers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { ActiveSkill, BattleParticipant, SkillEffect } from "@/types/battle";

export type EffectCategory = "damage" | "resistance" | "buff" | "dot" | "generic";

const DAMAGE_STATS = new Set([
  "melee_damage",
  "ranged_damage",
  "counter_damage",
  "physical_damage",
  "dark_spell_damage",
  "chaos_spell_damage",
  "spell_damage",
]);

const RESISTANCE_STATS = new Set([
  "physical_resistance",
  "spell_resistance",
  "all_resistance",
]);

const BUFF_DEBUFF_STATS = new Set([
  "hp_bonus",
  "armor",
  "speed",
  "initiative",
  "morale",
]);

const DOT_STATS = new Set([
  "bleed_damage",
  "poison_damage",
  "burn_damage",
  "fire_damage",
]);

export function categorizeStat(stat: string): EffectCategory {
  if (DAMAGE_STATS.has(stat)) return "damage";

  if (RESISTANCE_STATS.has(stat)) return "resistance";

  if (BUFF_DEBUFF_STATS.has(stat)) return "buff";

  if (DOT_STATS.has(stat)) return "dot";

  return "generic";
}

/** Damage stat → форматований рядок (на push у effects array). */
export function formatDamageEffect(effect: SkillEffect): string {
  return `${effect.stat}: +${effect.value}${effect.isPercentage ? "%" : ""}`;
}

/** Resistance stat → форматований рядок із фіксованим % suffix. */
export function formatResistanceEffect(effect: SkillEffect): string {
  return `${effect.stat}: ${effect.value}%`;
}

/**
 * hp_bonus / armor / speed / initiative / morale — додає ActiveEffect
 * як buff (positive) або debuff (negative). Повертає updated participant
 * + рядок ефекту + повідомлення.
 */
export function applyBuffDebuffEffect(
  skill: ActiveSkill,
  effect: SkillEffect,
  participant: BattleParticipant,
  currentRound: number,
): {
  participant: BattleParticipant;
  effectStr: string;
  message: string;
} {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dur = effect.duration ?? 1;

  const newEffects = addActiveEffect(
    participant,
    {
      id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: `${skill.name} — ${effect.stat}`,
      type: numValue > 0 ? "buff" : "debuff",
      icon: skill.icon ?? undefined,
      duration: dur,
      effects: [
        { type: effect.stat, value: numValue, isPercentage: effect.isPercentage },
      ],
    },
    currentRound,
  );

  return {
    participant: {
      ...participant,
      battleData: { ...participant.battleData, activeEffects: newEffects },
    },
    effectStr: `${effect.stat}: ${numValue > 0 ? "+" : ""}${effect.value}`,
    message: `✨ ${skill.name}: ${effect.stat} ${numValue > 0 ? "+" : ""}${effect.value}`,
  };
}

/**
 * bleed/poison/burn/fire DOT — додає ActiveEffect type=debuff з dotDamage.
 * Підтримує string-кубики (`2d6`) через parseDiceAverage або number.
 */
export function applyDotEffect(
  skill: ActiveSkill,
  effect: SkillEffect,
  participant: BattleParticipant,
  currentRound: number,
): {
  participant: BattleParticipant;
  effectStr: string;
  message: string;
} {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dotDmg =
    typeof effect.value === "string" ? parseDiceAverage(effect.value) : numValue;

  const dotDur = effect.duration ?? 1;

  const dmgType = effect.stat.replace("_damage", "");

  const newEffects = addActiveEffect(
    participant,
    {
      id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}`,
      name: `${skill.name} — ${dmgType}`,
      type: "debuff",
      icon: skill.icon ?? undefined,
      duration: dotDur,
      effects: [],
      dotDamage: { damagePerRound: dotDmg, damageType: dmgType },
    },
    currentRound,
  );

  return {
    participant: {
      ...participant,
      battleData: { ...participant.battleData, activeEffects: newEffects },
    },
    effectStr: `${dmgType} DOT: ${effect.value} (${dotDur} раундів)`,
    message: `🔥 ${skill.name}: ${dmgType} ${effect.value} на ${dotDur} раундів`,
  };
}

/** Generic / default branch — просто push string у effects array. */
export function formatGenericEffect(effect: SkillEffect): string {
  return `${effect.stat}: ${effect.value}`;
}
