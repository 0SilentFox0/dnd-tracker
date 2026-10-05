/**
 * Утиліти для розрахунку шкоди заклинання.
 *
 * Magic damage бере бонуси з `collectModifiers` (damage: magic + школа). Magic-специфічні
 * механіки (spellEffectIncrease, додатковий модифікатор, targetChange,
 * spellcasting modifier) живуть тут і застосовуються поверх загального pipeline.
 */

import { calculatePercentBonus } from "../common";

import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { logger } from "@/lib/utils/logger";
import type { SpellEnhancer } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface SkillDamageBonusContext {
  spellGroupId?: string | null;
}

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

/** Покращення заклинань, відфільтровані по школі (найвищий рівень у лінії відібрано при побудові). */
function getSpellEnhancementSkills(participant: BattleParticipant, ctx?: SkillDamageBonusContext): SpellEnhancer[] {
  const school = ctx?.spellGroupId ?? null;

  return (participant.battleData.spellEnhancers ?? []).filter((e) => !e.spellGroupId || !school || e.spellGroupId === school);
}

export function calculateSpellEffectIncrease(
  participant: BattleParticipant,
  ctx?: SkillDamageBonusContext,
): number {
  let totalIncrease = 0;

  for (const skill of getSpellEnhancementSkills(participant, ctx)) {
    if (skill.spellEnhancements.spellEffectIncrease) {
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
    if (skill.spellEnhancements.spellTargetChange) {
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
    if (skill.spellEnhancements.spellAdditionalModifier) {
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
  allParticipants?: BattleParticipant[];
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

  breakdown.push(`+ сума кубиків (${baseDamage})`);

  if (options?.addHeroLevelToBase === true) {
    const heroLevel = participant.abilities.level;

    running += heroLevel;

    breakdown.push(`+ рівень героя (${heroLevel})`);
  }

  const { mod: spellMod, label: spellAbbr } = getSpellcastingModifier(participant);

  if (spellMod !== 0 && spellAbbr) {
    running += spellMod;

    breakdown.push(
      `+ модифікатор ${spellAbbr} (${spellMod >= 0 ? "+" : ""}${spellMod})`,
    );
  }

  const mods = collectModifiers(withSelf(options?.allParticipants ?? [], participant), participant.basicInfo.id, {
    damage: { kind: "magic", school: ctx.spellGroupId },
  });

  running += mods.flat;

  for (const e of mods.entries) {
    if (e.flat) breakdown.push(`+ бонус flat: ${e.label} (${e.flat >= 0 ? "+" : ""}${e.flat})`);
  }

  // %-бонуси масштабують лише суму кубиків, не рівень героя і flat-надбавки
  if (mods.percent !== 0) {
    running += Math.floor((baseDamage * mods.percent) / 100);

    for (const e of mods.entries) {
      if (e.percent) breakdown.push(`+ бонус ${e.label}: ${e.percent}% від ${baseDamage} (${e.percent >= 0 ? "+" : ""}${Math.floor((baseDamage * e.percent) / 100)})`);
    }
  }

  logger.info("[magic-damage]", {
    casterId: participant.basicInfo.id,
    spellGroupId: ctx.spellGroupId ?? null,
    flatBonus: mods.flat,
    percentBonus: mods.percent,
    entries: mods.entries,
  });

  // Окрема magic-механіка: апгрейд ефекту заклинання (`Skill.spellEffectIncrease`).
  // Застосовується після %-бонусу зі скілів — як додаткова стадія.
  const effectIncrease = calculateSpellEffectIncrease(participant, ctx);

  if (effectIncrease > 0) {
    const add = calculatePercentBonus(running, effectIncrease);

    running += add;

    breakdown.push(
      `+ апгрейд заклинання: ${effectIncrease}% (+${add})`,
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
      `+ ${additionalModifier.modifier || "додатковий ефект"} (+${additionalDamage})`,
    );
  }

  breakdown.push(`= сума: ${running}`);

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
