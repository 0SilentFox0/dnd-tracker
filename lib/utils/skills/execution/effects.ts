/**
 * Застосування ефектів скіла (для executeSkillsByTrigger та complex triggers).
 *
 * Логіка per-effect-category винесена у effects-handlers.ts (CODE_AUDIT 3.8).
 * Тут лише category dispatch.
 */

import {
  applyBuffDebuffEffect,
  applyDotEffect,
  categorizeStat,
  formatDamageEffect,
  formatGenericEffect,
  formatResistanceEffect,
} from "./effects-handlers";

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
    switch (categorizeStat(effect.stat)) {
      case "damage":
        effects.push(formatDamageEffect(effect));
        break;

      case "resistance":
        effects.push(formatResistanceEffect(effect));
        break;

      case "buff": {
        const r = applyBuffDebuffEffect(skill, effect, updatedParticipant, currentRound);

        updatedParticipant = r.participant;
        effects.push(r.effectStr);
        messages.push(r.message);
        break;
      }

      case "dot": {
        const r = applyDotEffect(skill, effect, updatedParticipant, currentRound);

        updatedParticipant = r.participant;
        effects.push(r.effectStr);
        messages.push(r.message);
        break;
      }

      case "generic":
      default:
        effects.push(formatGenericEffect(effect));
        break;
    }
  }

  return { updatedParticipant, effects, messages };
}
