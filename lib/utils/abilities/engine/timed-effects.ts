import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface TimedEffectInput {
  timedKey: string;
  name: string;
  type: ActiveEffect["type"];
  rounds: number;
  stackable: boolean;
  abilityEffects?: StaticEffect[];
  effects?: ActiveEffect["effects"];
  dotDamage?: ActiveEffect["dotDamage"];
}

export function upsertTimedEffect(p: BattleParticipant, input: TimedEffectInput, round: number): BattleParticipant {
  const current = p.battleData.activeEffects;

  const existing = input.stackable ? -1 : current.findIndex((e) => e.abilityKey === input.timedKey);

  const effect: ActiveEffect = {
    id: input.stackable ? `${input.timedKey}@${round}#${current.length}` : input.timedKey,
    name: input.name,
    type: input.type,
    duration: input.rounds,
    appliedAt: { round, timestamp: new Date() },
    effects: input.effects ?? [],
    abilityKey: input.timedKey,
    ...(input.abilityEffects && { abilityEffects: input.abilityEffects }),
    ...(input.dotDamage && { dotDamage: input.dotDamage }),
  };

  const next = existing >= 0 ? current.map((e, i) => (i === existing ? effect : e)) : [...current, effect];

  return { ...p, battleData: { ...p.battleData, activeEffects: next } };
}
