/**
 * Застосування ефектів заклинання: DOT, дебафи/бафи з тривалістю, крадіжка мани
 */

import { addActiveEffect } from "../battle-effects";
import type { BattleSpell } from "../types/spell-process";

import { parseDurationToRounds } from "@/lib/utils/spells/duration-to-rounds";
import type { BattleParticipant } from "@/types/battle";

export function applySpellAdditionalModifier(
  spell: BattleSpell,
  updatedTargets: BattleParticipant[],
  additionalModifier: { modifier?: string; duration?: number; damage?: number },
  currentRound: number,
): BattleParticipant[] {
  if (!additionalModifier.modifier || !additionalModifier.duration) {
    return updatedTargets;
  }

  const modifierType = additionalModifier.modifier || "poison";

  const dotDamage = additionalModifier.damage || 0;

  if (dotDamage <= 0 || additionalModifier.duration <= 0) {
    return updatedTargets;
  }

  return updatedTargets.map((target) => {
    const updatedEffects = addActiveEffect(
      target,
      {
        id: `spell-modifier-${spell.id}-${target.basicInfo.id}-${Date.now()}`,
        name: `${spell.name} - ${modifierType}`,
        type: "debuff",
        description: spell.description,
        icon: spell.icon ?? undefined,
        duration: additionalModifier.duration ?? 1,
        effects: [
          {
            type: `${modifierType}_damage`,
            value: dotDamage,
            damageType: modifierType,
          },
        ],
        dotDamage: {
          damagePerRound: dotDamage,
          damageType: modifierType,
        },
      },
      currentRound,
    );

    return {
      ...target,
      battleData: {
        ...target.battleData,
        activeEffects: updatedEffects,
      },
    };
  });
}

export function applySpellDurationEffects(
  spell: BattleSpell,
  updatedTargets: BattleParticipant[],
  currentRound: number,
): BattleParticipant[] {
  const durationRounds =
    spell.effectDetails?.duration ?? parseDurationToRounds(spell.duration ?? "");

  let spellEffectDetails =
    spell.effectDetails?.effects?.map((e) => ({
      type: e.type,
      value: e.value,
      ...(e.isPercentage != null && { isPercentage: e.isPercentage }),
    })) ?? [];

  if (
    spell.healModifier === "vampirism" &&
    !spellEffectDetails.some((e) => e.type === "vampirism")
  ) {
    spellEffectDetails = [
      ...spellEffectDetails,
      { type: "vampirism", value: 50, isPercentage: true },
    ];
  }

  if (durationRounds <= 0 && spellEffectDetails.length === 0) {
    return updatedTargets;
  }

  const actualDuration = durationRounds > 0 ? durationRounds : 1;

  const isBeneficial = spellEffectDetails.every((e) => {
    if (e.type === "vampirism" || e.type === "ranged_damage_reduction") return true;

    return e.value >= 0;
  });

  const effectType = isBeneficial ? "buff" : "debuff";

  return updatedTargets.map((target) => {
    const updatedEffects = addActiveEffect(
      target,
      {
        id: `spell-effect-${spell.id}-${target.basicInfo.id}-${Date.now()}`,
        name: spell.name,
        type: effectType,
        description: spell.description,
        icon: spell.icon ?? undefined,
        duration: actualDuration,
        effects: spellEffectDetails,
      },
      currentRound,
    );

    return {
      ...target,
      battleData: {
        ...target.battleData,
        activeEffects: updatedEffects,
      },
    };
  });
}

const REMOVE_ALL_BUFFS = ["Remove all buffs"];

const REMOVE_ALL_DEBUFFS = [
  "Remove all debuffs",
  "Remove all curses/diseases/hostile spells",
];

/**
 * Знімає з цілей усі бафи або дебафи згідно з spell.effects.
 * Логіка розділена на 2 незалежні ефекти:
 * - "Remove all buffs" -> зняти лише buff
 * - "Remove all debuffs"/"Remove all curses/diseases/hostile spells" -> зняти лише debuff
 */
export function applySpellRemoveBuffsDebuffs(
  spell: BattleSpell,
  updatedTargets: BattleParticipant[],
): BattleParticipant[] {
  const effects = Array.isArray(spell.effects) ? spell.effects : [];

  const removeBuffs = effects.some((e) =>
      REMOVE_ALL_BUFFS.some((tag) => typeof e === "string" && e.includes(tag)),
    );

  const removeDebuffs = effects.some((e) =>
      REMOVE_ALL_DEBUFFS.some(
        (tag) => typeof e === "string" && e.includes(tag),
      ),
    );

  if (!removeBuffs && !removeDebuffs) return updatedTargets;

  return updatedTargets.map((target) => {
    let kept = target.battleData.activeEffects;

    if (removeBuffs) kept = kept.filter((e) => e.type !== "buff");

    if (removeDebuffs) kept = kept.filter((e) => e.type !== "debuff");

    if (kept.length === target.battleData.activeEffects.length) return target;

    return {
      ...target,
      battleData: {
        ...target.battleData,
        activeEffects: kept,
      },
    };
  });
}

export function applySpellManaSteal(
  spell: BattleSpell,
  updatedTargets: BattleParticipant[],
): BattleParticipant[] {
  const hasManaSteal =
    Array.isArray(spell.effects) && spell.effects.includes("Крадіжка мани");

  if (!hasManaSteal) return updatedTargets;

  return updatedTargets.map((target) => {
    const slot1 = target.spellcasting?.spellSlots?.["1"];

    if (!slot1 || typeof slot1.current !== "number" || slot1.current <= 0) {
      return target;
    }

    return {
      ...target,
      spellcasting: {
        ...target.spellcasting,
        spellSlots: {
          ...target.spellcasting.spellSlots,
          "1": {
            ...slot1,
            current: Math.max(0, slot1.current - 1),
          },
        },
      },
    };
  });
}
