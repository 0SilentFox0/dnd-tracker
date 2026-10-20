import type { CriticalEffect, CriticalEffectType } from "@/lib/constants/critical-effects";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { grantExtraActions } from "@/lib/utils/battle/participant/helpers";
import { addActiveEffect } from "@/lib/utils/battle/turn/effects";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

type EffectSpec = {
  idPart: string;
  type: ActiveEffect["type"];
  legacy?: string;
  legacyValue?: number;
  duration?: number;
  modifiers?: StaticEffect[];
  consumeOn?: ActiveEffect["consumeOn"];
  expireAtTurnEnd?: boolean;
};

const SKIP_ACTION_CERTAIN = 100;

let effectSeq = 0;

const DISADVANTAGE: StaticEffect = { kind: "flag", flag: "disadvantage" };

const MARK: StaticEffect = { kind: "flag", flag: "advantageForAttackers" };

/** Modifier-like crit effects are StaticEffects; condition markers stay in `effects`, where battle-turn and disabled-attacks read them. */
const SPECS: Record<CriticalEffectType, EffectSpec | ((effect: CriticalEffect) => EffectSpec) | null> = {
  advantage_next_attack: { idPart: "advantage", type: "buff", modifiers: [{ kind: "flag", flag: "advantage", attackKind: "all" }], consumeOn: "ownAttack", expireAtTurnEnd: true },
  disadvantage_next_attack: { idPart: "disadvantage", type: "debuff", modifiers: [DISADVANTAGE], consumeOn: "ownAttack", expireAtTurnEnd: true },
  ac_debuff: (effect) => ({
    idPart: "ac-debuff",
    type: "debuff",
    modifiers: [{ kind: "modifyStat", stat: "armor", flat: typeof effect.effect.value === "number" ? effect.effect.value : -2 }],
  }),
  combo_attack: { idPart: "combo", type: "debuff", modifiers: [DISADVANTAGE], consumeOn: "ownAttack" },
  block_bonus_action: { idPart: "block-bonus", type: "debuff", legacy: "no_bonus_action" },
  advantage_on_target: { idPart: "advantage-on-target", type: "debuff", modifiers: [MARK], consumeOn: "attackAgainst", expireAtTurnEnd: true },
  advantage_on_self: { idPart: "advantage-on-self", type: "debuff", modifiers: [MARK], consumeOn: "attackAgainst", expireAtTurnEnd: true },
  prone: { idPart: "prone", type: "condition", modifiers: [MARK, DISADVANTAGE], expireAtTurnEnd: true },
  weakened_next_hit: { idPart: "weakened", type: "debuff", legacy: "weakened_next_hit", legacyValue: 0.5, consumeOn: "ownHit", expireAtTurnEnd: true },
  lose_action: { idPart: "no-action", type: "debuff", legacy: "skip_action", legacyValue: SKIP_ACTION_CERTAIN, duration: 1 },
  double_damage: null,
  max_damage: null,
  additional_damage: null,
  free_attack: null,
  ignore_reactions: null,
  simple_miss: null,
  lose_bonus_action: null,
  provoke_opportunity_attack: null,
  lose_reaction: null,
};

function specFor(effect: CriticalEffect): EffectSpec | null {
  const spec = SPECS[effect.effect.type];

  return typeof spec === "function" ? spec(effect) : spec;
}

export function critFlavorFor(
  effect: CriticalEffect,
  attackerName: string,
  targetName: string,
  seed: { battleId: string; round: number; attackerId: string; targetId: string; suffix?: string },
): string {
  const key = `${seed.battleId}:${seed.round}:${seed.attackerId}:${seed.targetId}${seed.suffix ? `:${seed.suffix}` : ""}`;

  let sum = 0;

  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);

  return effect.flavor[sum % effect.flavor.length].replaceAll("{attacker}", attackerName).replaceAll("{target}", targetName);
}

export function applyCriticalEffect(
  participant: BattleParticipant,
  effect: CriticalEffect,
  currentRound: number,
  opts: { offTurn?: boolean } = {},
): BattleParticipant {
  const updated = { ...participant };

  switch (effect.effect.type) {
    case "lose_bonus_action":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedBonusAction: true } };
    case "lose_reaction":
      return { ...updated, actionFlags: { ...updated.actionFlags, hasUsedReaction: true } };
    case "free_attack":
      return opts.offTurn ? updated : grantExtraActions(updated, 1);
  }

  const spec = specFor(effect);

  if (!spec) return updated;

  const base = effect.effect.type === "combo_attack" && !opts.offTurn ? grantExtraActions(updated, 1) : updated;

  const duration = spec.duration ?? effect.effect.duration ?? 1;

  return {
    ...base,
    battleData: {
      ...base.battleData,
      activeEffects: addActiveEffect(
        base,
        {
          id: `critical-${spec.idPart}-${Date.now()}-${effectSeq++}`,
          name: effect.name,
          type: spec.type,
          description: effect.description,
          duration,
          effects: spec.legacy ? [{ type: spec.legacy, value: spec.legacyValue ?? 1 }] : [],
          ...(spec.modifiers && { abilityEffects: spec.modifiers }),
          ...(spec.consumeOn && { consumeOn: spec.consumeOn }),
          ...(spec.expireAtTurnEnd ? { expireAtTurnEnd: true } : { countdownAtTurnStart: true }),
        },
        currentRound,
      ),
    },
  };
}
