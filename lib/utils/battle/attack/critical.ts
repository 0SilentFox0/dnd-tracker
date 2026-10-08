import { addActiveEffect } from "../battle-effects";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

type EffectSpec = {
  idPart: string;
  type: ActiveEffect["type"];
  legacy?: string;
  legacyValue?: number;
  duration?: number;
  modifiers?: StaticEffect[];
  consumeOn?: ActiveEffect["consumeOn"];
};

const DISADVANTAGE: StaticEffect = { kind: "flag", flag: "disadvantage" };

const MARK: StaticEffect = { kind: "flag", flag: "advantageForAttackers" };

/** Modifier-like crit effects are StaticEffects; condition markers stay in `effects`, where battle-turn and disabled-attacks read them. */
function specFor(effect: CriticalEffect): EffectSpec | null {
  switch (effect.effect.type) {
    case "advantage_next_attack":
      return { idPart: "advantage", type: "buff", modifiers: [{ kind: "flag", flag: "advantage", attackKind: "all" }], consumeOn: "ownAttack" };
    case "disadvantage_next_attack":
      return { idPart: "disadvantage", type: "debuff", modifiers: [DISADVANTAGE], consumeOn: "ownAttack" };
    case "ac_debuff":
      return {
        idPart: "ac-debuff",
        type: "debuff",
        modifiers: [{ kind: "modifyStat", stat: "armor", flat: typeof effect.effect.value === "number" ? effect.effect.value : -2 }],
      };
    case "combo_attack":
      return { idPart: "combo", type: "debuff", modifiers: [DISADVANTAGE], consumeOn: "ownAttack" };
    case "block_bonus_action":
      return { idPart: "block-bonus", type: "debuff", legacy: "no_bonus_action" };
    case "advantage_on_target":
      return { idPart: "advantage-on-target", type: "debuff", modifiers: [MARK], consumeOn: "attackAgainst" };
    case "advantage_on_self":
      return { idPart: "advantage-on-self", type: "debuff", modifiers: [MARK], consumeOn: "attackAgainst" };
    case "prone":
      return { idPart: "prone", type: "condition", modifiers: [MARK, DISADVANTAGE] };
    case "weakened_next_hit":
      return { idPart: "weakened", type: "debuff", legacy: "weakened_next_hit", legacyValue: 0.5, consumeOn: "ownHit" };
    case "lose_action":
      return { idPart: "no-action", type: "debuff", legacy: "skip_action", legacyValue: 100, duration: 1 };
    default:
      return null;
  }
}

export function applyCriticalEffect(
  participant: BattleParticipant,
  effect: CriticalEffect,
  currentRound: number,
  target?: BattleParticipant,
  opts: { offTurn?: boolean } = {},
): BattleParticipant {
  const updated = { ...(target || participant) };

  switch (effect.effect.type) {
    case "lose_bonus_action":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedBonusAction: true } };
    case "lose_reaction":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedReaction: true } };
    case "free_attack":
      return opts.offTurn ? updated : withExtraAction(updated);
  }

  const spec = specFor(effect);

  if (!spec) return updated;

  const base = effect.effect.type === "combo_attack" && !opts.offTurn ? withExtraAction(updated) : updated;

  const duration = spec.duration ?? effect.effect.duration ?? 1;

  return {
    ...base,
    battleData: {
      ...base.battleData,
      activeEffects: addActiveEffect(
        base,
        {
          id: `critical-${spec.idPart}-${Date.now()}-${base.battleData.activeEffects.length}`,
          name: effect.name,
          type: spec.type,
          description: effect.description,
          duration,
          effects: spec.legacy ? [{ type: spec.legacy, value: spec.legacyValue ?? 1 }] : [],
          ...(spec.modifiers && { abilityEffects: spec.modifiers }),
          ...(spec.consumeOn && { consumeOn: spec.consumeOn }),
          ...(duration === 2 && { expireAtTurnEnd: true }),
        },
        currentRound,
      ),
    },
  };
}

function withExtraAction(p: BattleParticipant): BattleParticipant {
  return { ...p, battleData: { ...p.battleData, pendingExtraActions: (p.battleData.pendingExtraActions ?? 0) + 1 } };
}
