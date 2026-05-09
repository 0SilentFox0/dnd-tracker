/**
 * Single-effect applier для пасивних skill/artifact ефектів (CODE_AUDIT 1.9).
 *
 * Винесено з passive.ts — там залишається orchestration
 * (applyPassiveSkillEffects / applyArtifactPassiveEffects, які
 * ітерують активні скіли / артефакти і викликають applyOne…).
 *
 * Підтримуваний 30+case switch розбитий на 4 групи:
 *  - applyHpBonus            (hp_bonus з flat/formula)
 *  - applyResistance         (physical/spell/all resistance + cap)
 *  - applyMoraleEffect       (flat / min)
 *  - applyExtraFlagOrCounter (всі extras-stats: crit_threshold,
 *                              advantage, control_units, morale_*…)
 */

import { evaluateFormula as evaluateFormulaSafe } from "../common/formula-evaluator";
import {
  getParticipantExtras,
  getParticipantResistances,
  setParticipantExtras,
  setParticipantResistances,
} from "./extras";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import type { BattleParticipant, SkillEffect } from "@/types/battle";

export type PassiveResistanceContext =
  | { source: "artifact" }
  | { source: "skill"; skillId: string; resistanceWinners: Set<string> };

function allowResistanceEffect(ctx: PassiveResistanceContext): boolean {
  if (ctx.source === "artifact") return true;

  return ctx.resistanceWinners.has(ctx.skillId);
}

/** Обчислює формулу для ефекту (hero_level, lost_hp_percent, morale). */
function evaluateFormula(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent =
    maxHp > 0
      ? ((maxHp - currentHp) / maxHp) * BATTLE_CONSTANTS.FRACTION_TO_PERCENT
      : 0;

  const context: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  return Math.floor(evaluateFormulaSafe(formula, context));
}

function applyHpBonus(
  participant: BattleParticipant,
  effect: SkillEffect,
): void {
  const bonus =
    effect.type === "formula" && typeof effect.value === "string"
      ? evaluateFormula(effect.value, participant)
      : typeof effect.value === "number"
        ? effect.value
        : 0;

  participant.combatStats.maxHp += bonus;
  participant.combatStats.currentHp += bonus;
}

function applyResistanceStat(
  participant: BattleParticipant,
  effect: SkillEffect,
  numValue: number,
): void {
  const resistances = getParticipantResistances(participant);

  const cap = BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP;

  if (effect.stat === "physical_resistance") {
    resistances.physical = Math.min(cap, (resistances.physical ?? 0) + numValue);
  } else if (effect.stat === "spell_resistance") {
    resistances.spell = Math.min(cap, (resistances.spell ?? 0) + numValue);
  } else {
    // all_resistance
    resistances.physical = Math.min(cap, (resistances.physical ?? 0) + numValue);
    resistances.spell = Math.min(cap, (resistances.spell ?? 0) + numValue);
  }

  setParticipantResistances(participant, resistances);
}

function applyMoraleEffect(
  participant: BattleParticipant,
  effect: SkillEffect,
  numValue: number,
): void {
  if (effect.type === "min") {
    if (participant.combatStats.morale < numValue) {
      participant.combatStats.morale = numValue;
    }

    const ext = getParticipantExtras(participant);

    ext.minMorale = Math.max(ext.minMorale ?? -Infinity, numValue);
    setParticipantExtras(participant, ext);

    return;
  }

  participant.combatStats.morale += numValue;
}

function applySpellSlots4_5(
  participant: BattleParticipant,
  numValue: number,
): void {
  for (const lvl of ["4", "5"]) {
    const slot = participant.spellcasting.spellSlots[lvl];

    if (slot) {
      slot.max += numValue;
      slot.current += numValue;
    } else {
      participant.spellcasting.spellSlots[lvl] = {
        max: numValue,
        current: numValue,
      };
    }
  }
}

/**
 * Застосовує один пасивний ефект (скіл або артефакт) до учасника.
 * Резисти зі скілів — лише найвищий рівень на лінію (через ctx.resistanceWinners).
 */
export function applyOnePassiveStatEffect(
  participant: BattleParticipant,
  effect: SkillEffect,
  ctx: PassiveResistanceContext,
): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  switch (effect.stat) {
    case "hp_bonus":
      applyHpBonus(participant, effect);

      return;

    case "physical_resistance":
    case "spell_resistance":
    case "all_resistance":
      if (!allowResistanceEffect(ctx)) return;

      applyResistanceStat(participant, effect, numValue);

      return;

    case "morale":
      applyMoraleEffect(participant, effect, numValue);

      return;

    case "crit_threshold": {
      const ext = getParticipantExtras(participant);

      ext.critThreshold = Math.min(ext.critThreshold ?? 20, numValue);
      setParticipantExtras(participant, ext);

      return;
    }

    case "spell_levels": {
      const ext = getParticipantExtras(participant);

      ext.maxSpellLevel = Math.max(ext.maxSpellLevel ?? 0, numValue);
      setParticipantExtras(participant, ext);

      return;
    }

    case "spell_slots_lvl4_5":
      applySpellSlots4_5(participant, numValue);

      return;

    case "enemy_attack_disadvantage": {
      const ext = getParticipantExtras(participant);

      ext.enemyAttackDisadvantage = true;
      setParticipantExtras(participant, ext);

      return;
    }

    case "advantage": {
      const ext = getParticipantExtras(participant);

      ext.advantageOnAllRolls = true;
      setParticipantExtras(participant, ext);

      return;
    }

    case "advantage_ranged": {
      const ext = getParticipantExtras(participant);

      ext.advantageOnRangedAttacks = true;
      setParticipantExtras(participant, ext);

      return;
    }

    case "spell_targets_lvl4_5": {
      const ext = getParticipantExtras(participant);

      ext.spellTargetsLvl45 = (ext.spellTargetsLvl45 ?? 1) + numValue;
      setParticipantExtras(participant, ext);

      return;
    }

    case "light_spells_target_all_allies": {
      const ext = getParticipantExtras(participant);

      ext.lightSpellsTargetAllAllies = true;
      setParticipantExtras(participant, ext);

      return;
    }

    case "control_units": {
      const ext = getParticipantExtras(participant);

      ext.controlUnits = (ext.controlUnits ?? 0) + numValue;
      setParticipantExtras(participant, ext);

      return;
    }

    case "morale_per_kill":
    case "morale_per_ally_death": {
      const ext = getParticipantExtras(participant);

      if (effect.stat === "morale_per_kill") {
        ext.moralePerKill = (ext.moralePerKill ?? 0) + numValue;
      } else {
        ext.moralePerAllyDeath = (ext.moralePerAllyDeath ?? 0) + numValue;
      }

      setParticipantExtras(participant, ext);

      return;
    }

    case "melee_damage":
    case "ranged_damage":
    case "counter_damage":
    case "dark_spell_damage":
    case "chaos_spell_damage":
    case "spell_damage":
    case "physical_damage":
    case "damage":
      // Damage stats handled у damage-pipeline (lib/utils/battle/damage),
      // не тут. Залишаємо no-op.
      return;

    default:
      return;
  }
}
