/**
 * Застосування пасивних ефектів скілів та артефактів до учасника
 */

import { evaluateFormula as evaluateFormulaSafe } from "../common/formula-evaluator";
import {
  getParticipantExtras,
  getParticipantResistances,
  setParticipantExtras,
  setParticipantResistances,
} from "./extras";

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant, SkillEffect } from "@/types/battle";

const SKILL_LEVEL_RANK: Record<string, number> = {
  [SkillLevel.BASIC]: 1,
  [SkillLevel.ADVANCED]: 2,
  [SkillLevel.EXPERT]: 3,
};

/** Скіли з резистом — лише найвищий рівень на лінію (mainSkillId). */
function getResistanceSkillIdsHighestOnly(
  activeSkills: ActiveSkill[],
): Set<string> {
  const byMainSkill = new Map<string, { skill: ActiveSkill; rank: number }>();

  for (const skill of activeSkills) {
    const hasResistance = (skill.effects ?? []).some(
      (e) =>
        e.stat === "physical_resistance" ||
        e.stat === "spell_resistance" ||
        e.stat === "all_resistance",
    );

    if (!hasResistance) continue;

    const key = skill.mainSkillId || skill.skillId;

    const rank = SKILL_LEVEL_RANK[skill.level ?? SkillLevel.BASIC] ?? 1;

    const existing = byMainSkill.get(key);

    if (!existing || rank > existing.rank) {
      byMainSkill.set(key, { skill, rank });
    }
  }

  return new Set([...byMainSkill.values()].map((v) => v.skill.skillId));
}

/** Обчислює формулу для ефекту (hero_level, lost_hp_percent, morale). */
function evaluateFormula(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  const context: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  const result = evaluateFormulaSafe(formula, context);

  return Math.floor(result);
}

export type PassiveResistanceContext =
  | { source: "artifact" }
  | { source: "skill"; skillId: string; resistanceWinners: Set<string> };

function allowResistanceEffect(
  ctx: PassiveResistanceContext,
): boolean {
  if (ctx.source === "artifact") return true;

  return ctx.resistanceWinners.has(ctx.skillId);
}

/**
 * Один пасивний ефект (скіл або артефакт). Для скілів резисти з обмеженням по лінії.
 */
export function applyOnePassiveStatEffect(
  participant: BattleParticipant,
  effect: SkillEffect,
  ctx: PassiveResistanceContext,
): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  switch (effect.stat) {
    case "hp_bonus": {
      let bonus = 0;

      if (effect.type === "formula" && typeof effect.value === "string") {
        bonus = evaluateFormula(effect.value, participant);
      } else {
        bonus = numValue;
      }

      participant.combatStats.maxHp += bonus;
      participant.combatStats.currentHp += bonus;
      break;
    }

    case "physical_resistance":
    case "spell_resistance":
    case "all_resistance": {
      if (!allowResistanceEffect(ctx)) break;

      const resistances = getParticipantResistances(participant);

      if (effect.stat === "physical_resistance") {
        resistances.physical = Math.min(
          100,
          (resistances.physical ?? 0) + numValue,
        );
      } else if (effect.stat === "spell_resistance") {
        resistances.spell = Math.min(
          100,
          (resistances.spell ?? 0) + numValue,
        );
      } else {
        resistances.physical = Math.min(
          100,
          (resistances.physical ?? 0) + numValue,
        );
        resistances.spell = Math.min(
          100,
          (resistances.spell ?? 0) + numValue,
        );
      }

      setParticipantResistances(participant, resistances);
      break;
    }

    case "morale": {
      if (effect.type === "min") {
        const minMorale = numValue;

        if (participant.combatStats.morale < minMorale) {
          participant.combatStats.morale = minMorale;
        }

        const ext = getParticipantExtras(participant);

        ext.minMorale = Math.max(ext.minMorale ?? -Infinity, minMorale);
        setParticipantExtras(participant, ext);
      } else {
        participant.combatStats.morale += numValue;
      }

      break;
    }

    case "crit_threshold": {
      const ext = getParticipantExtras(participant);

      ext.critThreshold = Math.min(ext.critThreshold ?? 20, numValue);
      setParticipantExtras(participant, ext);
      break;
    }

    case "spell_levels": {
      const ext = getParticipantExtras(participant);

      ext.maxSpellLevel = Math.max(ext.maxSpellLevel ?? 0, numValue);
      setParticipantExtras(participant, ext);
      break;
    }

    case "spell_slots_lvl4_5": {
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
      break;
    }

    case "enemy_attack_disadvantage": {
      const ext = getParticipantExtras(participant);

      ext.enemyAttackDisadvantage = true;
      setParticipantExtras(participant, ext);
      break;
    }

    case "advantage": {
      const ext = getParticipantExtras(participant);

      ext.advantageOnAllRolls = true;
      setParticipantExtras(participant, ext);
      break;
    }

    case "advantage_ranged": {
      const ext = getParticipantExtras(participant);

      ext.advantageOnRangedAttacks = true;
      setParticipantExtras(participant, ext);
      break;
    }

    case "spell_targets_lvl4_5": {
      const ext = getParticipantExtras(participant);

      ext.spellTargetsLvl45 = (ext.spellTargetsLvl45 ?? 1) + numValue;
      setParticipantExtras(participant, ext);
      break;
    }

    case "light_spells_target_all_allies": {
      const ext = getParticipantExtras(participant);

      ext.lightSpellsTargetAllAllies = true;
      setParticipantExtras(participant, ext);
      break;
    }

    case "control_units": {
      const ext = getParticipantExtras(participant);

      ext.controlUnits = (ext.controlUnits ?? 0) + numValue;
      setParticipantExtras(participant, ext);
      break;
    }

    case "melee_damage":
    case "ranged_damage":
    case "counter_damage":
    case "dark_spell_damage":
    case "chaos_spell_damage":
    case "spell_damage":
    case "physical_damage":
    case "damage":
      break;

    case "morale_per_kill":
    case "morale_per_ally_death": {
      const ext = getParticipantExtras(participant);

      if (effect.stat === "morale_per_kill") {
        ext.moralePerKill = (ext.moralePerKill ?? 0) + numValue;
      } else {
        ext.moralePerAllyDeath = (ext.moralePerAllyDeath ?? 0) + numValue;
      }

      setParticipantExtras(participant, ext);
      break;
    }

    default:
      break;
  }
}

/**
 * Пасивні ефекти з `passiveAbility.effects` усіх екіпірованих артефактів.
 */
export function applyArtifactPassiveEffects(
  participant: BattleParticipant,
): void {
  const ctx: PassiveResistanceContext = { source: "artifact" };

  for (const artifact of participant.battleData.equippedArtifacts) {
    const aud = artifact.effectAudience;

    if (aud === ARTIFACT_EFFECT_ALL_ALLIES || aud === ARTIFACT_EFFECT_ALL_ENEMIES) {
      continue;
    }

    const raw = artifact.passiveAbility;

    if (!raw || typeof raw !== "object") continue;

    const effects = (raw as { effects?: SkillEffect[] }).effects;

    if (!Array.isArray(effects)) continue;

    for (const effect of effects) {
      if (!effect || typeof effect.stat !== "string") continue;

      applyOnePassiveStatEffect(participant, effect, ctx);
    }
  }
}

/**
 * Застосовує пасивні (trigger: "passive") ефекти скілів до учасника при ініціалізації.
 * Резисти враховуються лише з найвищого рівня скіла на лінію.
 */
export function applyPassiveSkillEffects(participant: BattleParticipant): void {
  const resistanceSkillIds = getResistanceSkillIdsHighestOnly(
    participant.battleData.activeSkills,
  );

  for (const skill of participant.battleData.activeSkills) {
    const isPassive = skill.skillTriggers?.some(
      (t) => t.type === "simple" && t.trigger === "passive",
    );

    if (!isPassive) continue;

    const ctx: PassiveResistanceContext = {
      source: "skill",
      skillId: skill.skillId,
      resistanceWinners: resistanceSkillIds,
    };

    for (const effect of skill.effects) {
      applyOnePassiveStatEffect(participant, effect, ctx);
    }
  }
}
