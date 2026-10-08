import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface TimedEffectInput {
  timedKey: string;
  name: string;
  type: ActiveEffect["type"];
  rounds: number;
  stackable: boolean;
  maxStacks?: number;
  abilityEffects?: StaticEffect[];
  effects?: ActiveEffect["effects"];
  dotDamage?: ActiveEffect["dotDamage"];
  hotHeal?: ActiveEffect["hotHeal"];
  source?: ActiveEffect["source"];
}

export function effectSource(
  owner: BattleParticipant | undefined,
  ability: { name: string; source?: { icon?: string | null } },
): ActiveEffect["source"] {
  if (!owner) return undefined;

  return { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName: ability.name, icon: ability.source?.icon };
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
    ...(input.hotHeal && { hotHeal: input.hotHeal }),
    ...(input.source && { source: input.source }),
  };

  const sameKey = current.filter((e) => e.abilityKey === input.timedKey);

  if (input.stackable && input.maxStacks !== undefined && sameKey.length >= input.maxStacks) {
    const oldest = sameKey.reduce((least, e) => (e.duration < least.duration ? e : least));

    return {
      ...p,
      battleData: { ...p.battleData, activeEffects: current.map((e) => (e === oldest ? { ...e, duration: input.rounds, appliedAt: effect.appliedAt } : e)) },
    };
  }

  const next = existing >= 0 ? current.map((e, i) => (i === existing ? effect : e)) : [...current, effect];

  return { ...p, battleData: { ...p.battleData, activeEffects: next } };
}
