/**
 * Застосування ефектів скіла (для executeSkillsByTrigger та complex triggers)
 */

import { parseDiceAverage } from "./helpers";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

export function executeSkillEffects(
  skill: ActiveSkill,
  participant: BattleParticipant,
  _allParticipants: BattleParticipant[],
  currentRound: number,
): {
  updatedParticipant: BattleParticipant;
  effects: string[];
  messages: string[];
} {
  let updatedParticipant = { ...participant };

  const effects: string[] = [];

  const messages: string[] = [];

  for (const effect of skill.effects) {
    const numValue = typeof effect.value === "number" ? effect.value : 0;

    switch (effect.stat) {
      case "melee_damage":
      case "ranged_damage":
      case "counter_damage":
      case "physical_damage":
      case "dark_spell_damage":
      case "chaos_spell_damage":
      case "spell_damage":
        effects.push(`${effect.stat}: +${effect.value}${effect.isPercentage ? "%" : ""}`);
        break;

      case "physical_resistance":
      case "spell_resistance":
      case "all_resistance":
        effects.push(`${effect.stat}: ${effect.value}%`);
        break;

      case "hp_bonus":
      case "armor":
      case "speed":
      case "initiative":
      case "morale": {
        const effectName = `${skill.name} — ${effect.stat}`;

        const dur = effect.duration ?? 1;

        const newEffects = addActiveEffect(
          updatedParticipant,
          {
            id: `skill-${skill.skillId}-${effect.stat}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: effectName,
            type: numValue > 0 ? "buff" : "debuff",
            icon: skill.icon ?? undefined,
            duration: dur,
            effects: [{ type: effect.stat, value: numValue, isPercentage: effect.isPercentage }],
          },
          currentRound,
        );

        updatedParticipant = {
          ...updatedParticipant,
          battleData: { ...updatedParticipant.battleData, activeEffects: newEffects },
        };
        effects.push(`${effect.stat}: ${numValue > 0 ? "+" : ""}${effect.value}`);
        messages.push(`✨ ${skill.name}: ${effect.stat} ${numValue > 0 ? "+" : ""}${effect.value}`);
        break;
      }

      case "bleed_damage":
      case "poison_damage":
      case "burn_damage":
      case "fire_damage": {
        const dotDmg = typeof effect.value === "string" ? parseDiceAverage(effect.value) : numValue;

        const dotDur = effect.duration ?? 1;

        const dmgType = effect.stat.replace("_damage", "");

        const dotEffects = addActiveEffect(
          updatedParticipant,
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

        updatedParticipant = {
          ...updatedParticipant,
          battleData: { ...updatedParticipant.battleData, activeEffects: dotEffects },
        };
        effects.push(`${dmgType} DOT: ${effect.value} (${dotDur} раундів)`);
        messages.push(`🔥 ${skill.name}: ${dmgType} ${effect.value} на ${dotDur} раундів`);
        break;
      }

      case "attack_before_enemy":
      case "guaranteed_hit":
      case "damage_resistance":
      case "enemy_attack_disadvantage":
      case "light_spells_target_all_allies":
      case "new_spell":
      case "spell_area":
      case "area_damage":
      case "advantage":
      case "survive_lethal":
      case "actions":
      case "extra_casts":
      case "redirect_physical_damage":
      case "summon_tier":
      case "marked_targets":
      case "field_damage":
      case "revive_hp":
      case "crit_threshold":
      case "spell_levels":
      case "spell_slots_lvl4_5":
      case "spell_targets_lvl4_5":
      case "max_targets":
      case "morale_per_kill":
      case "morale_per_ally_death":
      case "damage":
      case "heal":
      case "control_units":
      case "summon_count":
      case "summon_hp":
      case "summon_damage":
      case "spell_hp":
      case "enemy_summon_damage":
      case "armor_reduction":
      case "area_cells":
      case "caster_self_damage":
      case "exp_gain":
      case "magic_schools":
      case "morale_restore":
      case "clear_negative_effects":
      case "resurrect_count":
      case "resurrect_hp":
      case "restore_spell_slot":
        effects.push(`${effect.stat}: ${effect.value}`);
        break;

      default:
        effects.push(`${effect.stat}: ${effect.value}`);
        break;
    }
  }

  return { updatedParticipant, effects, messages };
}
