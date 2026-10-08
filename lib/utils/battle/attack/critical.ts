import { addActiveEffect } from "../battle-effects";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

type EffectSpec = {
  idPart: string;
  type: ActiveEffect["type"];
  legacy?: string;
  modifiers?: StaticEffect[];
};

const LEGACY = (idPart: string, type: ActiveEffect["type"], legacy: string): EffectSpec => ({ idPart, type, legacy });

/** Modifier-like crit effects are StaticEffects; condition markers stay in `effects`, where battle-turn and disabled-attacks read them. */
function specFor(effect: CriticalEffect): EffectSpec | null {
  switch (effect.effect.type) {
    case "stun":
      return LEGACY(String(effect.id), "debuff", "stun");
    case "advantage_next_attack":
      return { idPart: "advantage", type: "buff", modifiers: [{ kind: "flag", flag: "advantage", attackKind: "all" }] };
    case "ac_debuff":
      return {
        idPart: "ac-debuff",
        type: "debuff",
        modifiers: [{ kind: "modifyStat", stat: "armor", flat: typeof effect.effect.value === "number" ? effect.effect.value : -2 }],
      };
    case "free_attack":
      return LEGACY("free-attack", "buff", "extra_attack");
    case "block_bonus_action":
      return LEGACY("block-bonus", "debuff", "no_bonus_action");
    case "advantage_on_target":
      return LEGACY("advantage-on-target", "debuff", "advantage_against_me");
    case "combo_attack":
      return LEGACY("combo", "buff", "combo_attack_disadvantage");
    case "prone":
      return LEGACY("prone", "condition", "prone");
    case "disadvantage_next_attack":
      return { idPart: "disadvantage", type: "debuff", modifiers: [{ kind: "flag", flag: "disadvantage" }] };
    case "lose_reaction":
      return LEGACY("no-reaction", "debuff", "no_reaction");
    case "advantage_on_self":
      return LEGACY("advantage-on-self", "debuff", "advantage_against_me");
    default:
      return null;
  }
}

export function applyCriticalEffect(
  participant: BattleParticipant,
  effect: CriticalEffect,
  currentRound: number,
  target?: BattleParticipant,
): BattleParticipant {
  const updated = { ...(target || participant) };

  switch (effect.effect.type) {
    case "lose_bonus_action":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedBonusAction: true } };
    case "lose_action":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedAction: true } };
  }

  const spec = specFor(effect);

  if (!spec) return updated;

  return {
    ...updated,
    battleData: {
      ...updated.battleData,
      activeEffects: addActiveEffect(
        updated,
        {
          id: `critical-${spec.idPart}-${Date.now()}-${updated.battleData.activeEffects.length}`,
          name: effect.name,
          type: spec.type,
          description: effect.description,
          duration: effect.effect.duration ?? 1,
          effects: spec.legacy ? [{ type: spec.legacy, value: 1 }] : [],
          ...(spec.modifiers && { abilityEffects: spec.modifiers }),
        },
        currentRound,
      ),
    },
  };
}
