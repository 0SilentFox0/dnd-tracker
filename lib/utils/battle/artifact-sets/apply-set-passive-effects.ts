/**
 * passiveEffects з бонусу сету (підмножина логіки skill passive).
 */

import { evaluateFormula as evaluateFormulaSafe } from "../common/formula-evaluator";
import {
  getParticipantExtras,
  getParticipantResistances,
  setParticipantExtras,
  setParticipantResistances,
} from "../participant/extras";

import type { ArtifactSetPassiveEffect } from "@/lib/types/artifact-set-bonus";
import type { BattleParticipant } from "@/types/battle";

function evalFormulaForParticipant(
  formula: string,
  participant: BattleParticipant,
): number {
  const maxHp = participant.combatStats.maxHp;

  const currentHp = participant.combatStats.currentHp;

  const lostHpPercent = maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0;

  const ctx: Record<string, number> = {
    hero_level: participant.abilities.level,
    lost_hp_percent: lostHpPercent,
    morale: participant.combatStats.morale,
  };

  return Math.floor(evaluateFormulaSafe(formula, ctx));
}

export function applyArtifactSetPassiveEffects(
  participant: BattleParticipant,
  effects: ArtifactSetPassiveEffect[],
): void {
  for (const effect of effects) {
    const num =
      typeof effect.value === "number"
        ? effect.value
        : Number(effect.value) || 0;

    switch (effect.stat) {
      case "hp_bonus": {
        const bonus =
          effect.type === "formula" && typeof effect.value === "string"
            ? evalFormulaForParticipant(effect.value, participant)
            : num;

        participant.combatStats.maxHp += bonus;
        participant.combatStats.currentHp += bonus;
        break;
      }

      case "physical_resistance":
      case "spell_resistance":
      case "all_resistance": {
        const res = getParticipantResistances(participant);

        if (effect.stat === "physical_resistance") {
          res.physical = Math.min(100, (res.physical ?? 0) + num);
        } else if (effect.stat === "spell_resistance") {
          res.spell = Math.min(100, (res.spell ?? 0) + num);
        } else {
          res.physical = Math.min(100, (res.physical ?? 0) + num);
          res.spell = Math.min(100, (res.spell ?? 0) + num);
        }

        setParticipantResistances(participant, res);
        break;
      }

      case "morale": {
        if (effect.type === "min") {
          if (participant.combatStats.morale < num) {
            participant.combatStats.morale = num;
          }

          const ext = getParticipantExtras(participant);

          ext.minMorale = Math.max(ext.minMorale ?? -Infinity, num);
          setParticipantExtras(participant, ext);
        } else {
          participant.combatStats.morale += num;
        }

        break;
      }

      case "crit_threshold": {
        const ext = getParticipantExtras(participant);

        ext.critThreshold = Math.min(ext.critThreshold ?? 20, num);
        setParticipantExtras(participant, ext);
        break;
      }

      case "spell_levels": {
        const ext = getParticipantExtras(participant);

        ext.maxSpellLevel = Math.max(ext.maxSpellLevel ?? 0, num);
        setParticipantExtras(participant, ext);
        break;
      }

      case "spell_slots_lvl4_5": {
        for (const lvl of ["4", "5"] as const) {
          const slot = participant.spellcasting.spellSlots[lvl];

          if (slot) {
            slot.max += num;
            slot.current += num;
          } else {
            participant.spellcasting.spellSlots[lvl] = {
              max: num,
              current: num,
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

        ext.spellTargetsLvl45 = (ext.spellTargetsLvl45 ?? 1) + num;
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

        ext.controlUnits = (ext.controlUnits ?? 0) + num;
        setParticipantExtras(participant, ext);
        break;
      }

      case "morale_per_kill":
      case "morale_per_ally_death": {
        const ext = getParticipantExtras(participant);

        if (effect.stat === "morale_per_kill") {
          ext.moralePerKill = (ext.moralePerKill ?? 0) + num;
        } else {
          ext.moralePerAllyDeath = (ext.moralePerAllyDeath ?? 0) + num;
        }

        setParticipantExtras(participant, ext);
        break;
      }

      default:
        break;
    }
  }
}
