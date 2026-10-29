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
  breakOnDamage?: boolean;
  charmOrigin?: ActiveEffect["charmOrigin"];
  countdownAtTurnStart?: boolean;
  until?: "turnEnd" | "nextTurnStart";
  consumeOn?: ActiveEffect["consumeOn"];
  source?: ActiveEffect["source"];
  permanent?: boolean;
  saveEnds?: ActiveEffect["saveEnds"];
  linkedTo?: ActiveEffect["linkedTo"];
  concentrationOf?: ActiveEffect["concentrationOf"];
  concentration?: ActiveEffect["concentration"];
  hitRider?: ActiveEffect["hitRider"];
  exhaustionVariant?: ActiveEffect["exhaustionVariant"];
}

export function effectSource(
  owner: BattleParticipant | undefined,
  ability: { name: string; source?: { type?: string; name?: string; icon?: string | null; personal?: boolean } },
): ActiveEffect["source"] {
  if (!owner) return undefined;

  const abilityName = ability.source?.type === "race" && ability.source.name ? `${ability.source.name}: ${ability.name}` : ability.name;

  return { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName, icon: ability.source?.icon, ...(ability.source?.personal && { personal: true }) };
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
    ...(input.breakOnDamage && { breakOnDamage: true }),
    ...(input.charmOrigin && { charmOrigin: input.charmOrigin }),
    ...((input.countdownAtTurnStart || input.until === "nextTurnStart") && { countdownAtTurnStart: true }),
    ...(input.until === "turnEnd" && { armed: true, expireAtTurnEnd: true }),
    ...(input.consumeOn && { consumeOn: input.consumeOn }),
    ...(input.source && { source: input.source }),
    ...(input.permanent && { permanent: true }),
    ...(input.saveEnds && { saveEnds: input.saveEnds }),
    ...(input.linkedTo && { linkedTo: input.linkedTo }),
    ...(input.concentrationOf && { concentrationOf: input.concentrationOf }),
    ...(input.concentration && { concentration: input.concentration }),
    ...(input.hitRider && { hitRider: input.hitRider }),
    ...(input.exhaustionVariant && { exhaustionVariant: input.exhaustionVariant }),
  };

  const sameKey = current.filter((e) => e.abilityKey === input.timedKey);

  if (input.stackable && input.maxStacks !== undefined && sameKey.length >= input.maxStacks) {
    const oldest = sameKey.reduce((least, e) => (e.duration < least.duration ? e : least));

    return {
      ...p,
      battleData: { ...p.battleData, activeEffects: current.map((e) => (e === oldest ? { ...e, duration: input.rounds, appliedAt: effect.appliedAt, armed: undefined } : e)) },
    };
  }

  const next = existing >= 0 ? current.map((e, i) => (i === existing ? effect : e)) : [...current, effect];

  return { ...p, battleData: { ...p.battleData, activeEffects: next } };
}
