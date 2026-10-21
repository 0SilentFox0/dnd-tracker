import { abilityNature } from "./effect-nature";
import { effectSource } from "./timed-effects";

import { resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import { auraKey } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, inPlay, isActive, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/core/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { AREA_TARGETS, type AreaTarget, isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface AreaAura {
  /** ключ зони в межах власника: ability.key + сторона */
  id: string;
  ability: ResolvedAbility;
  target: AreaTarget;
  effects: StaticEffect[];
}

export function areaAuras(p: BattleParticipant): AreaAura[] {
  return resolvedAbilitiesOf(p).flatMap((ability) => {
    if (ability.trigger.event !== "passive") return [];

    return AREA_TARGETS.flatMap((target) => {
      const effects = ability.effects.filter((e): e is StaticEffect => isStaticEffect(e) && e.target === target);

      return effects.length ? [{ id: `${ability.key}:${target}`, ability, target, effects }] : [];
    });
  });
}

export const zoneEffectId = (ownerId: string, auraId: string) => `zone:${ownerId}:${auraId}`;

/** Хто може бути в зоні: живі учасники відповідної сторони (власник — у своїй зоні союзників). */
export function zoneCandidates(ps: BattleParticipant[], owner: BattleParticipant, target: AreaTarget): BattleParticipant[] {
  const allies = target === "nearbyAllies";

  return ps.filter((p) => inPlay(p) && (p.basicInfo.side === owner.basicInfo.side) === allies);
}

/** Поточний склад зони — з ефектів на цілях. */
export function zoneMembers(ps: BattleParticipant[], ownerId: string, auraId: string): { ids: string[]; round: number | null } {
  const id = zoneEffectId(ownerId, auraId);

  let round: number | null = null;

  const ids = ps.flatMap((p) => {
    const e = p.battleData.activeEffects.find((x) => x.id === id);

    if (!e) return [];

    round = Math.max(round ?? 0, e.appliedAt.round);

    return [p.basicInfo.id];
  });

  return { ids, round };
}

/** Аури власника, зону яких ще не вказано в цьому раунді. */
export function pendingAreaAuras(ps: BattleParticipant[], ownerId: string, round: number): AreaAura[] {
  const owner = findParticipant(ps, ownerId);

  if (!owner || !isActive(owner)) return [];

  return areaAuras(owner).filter((a) => owner.battleData.auraZones?.[a.id] !== round);
}

function resolvedEffect(e: StaticEffect, owner: BattleParticipant): StaticEffect {
  return {
    ...e,
    target: "self",
    ...("flat" in e && e.flat !== undefined && { flat: resolveFlat(e.flat, owner) }),
    ...("percent" in e && e.percent !== undefined && { percent: resolveFlat(e.percent, owner) }),
  };
}

export function auraZoneEffect(owner: BattleParticipant, aura: AreaAura, round: number): ActiveEffect {
  const ownerId = owner.basicInfo.id;

  const id = zoneEffectId(ownerId, aura.id);

  const abilityEffects = aura.effects.map((e) => resolvedEffect(e, owner));

  return {
    id,
    name: aura.ability.name,
    type: abilityNature(abilityEffects) ?? (aura.target === "nearbyEnemies" ? "debuff" : "buff"),
    duration: 1,
    permanent: true,
    appliedAt: { round, timestamp: new Date() },
    effects: [],
    abilityKey: id,
    abilityEffects,
    source: effectSource(owner, aura.ability),
    zone: { ownerId, key: `${auraKey(aura.ability)}:${aura.target}` },
  };
}

/** Нова зона аури: знімає попередню цього власника, накладає ефект на обраних і записує раунд вибору на власнику. */
export function applyAuraZone(ps: BattleParticipant[], owner: BattleParticipant, aura: AreaAura, targetIds: string[], round: number): BattleParticipant[] {
  const ownerId = owner.basicInfo.id;

  const effect = auraZoneEffect(owner, aura, round);

  const id = effect.id;

  const chosen = new Set(targetIds);

  return ps.map((p) => {
    const rest = p.battleData.activeEffects.filter((e) => e.id !== id);

    const activeEffects = chosen.has(p.basicInfo.id) ? [...rest, effect] : rest;

    const auraZones = p.basicInfo.id === ownerId ? { ...p.battleData.auraZones, [aura.id]: round } : p.battleData.auraZones;

    if (p.basicInfo.id !== ownerId && activeEffects.length === p.battleData.activeEffects.length && !chosen.has(p.basicInfo.id)) return p;

    return { ...p, battleData: { ...p.battleData, activeEffects, auraZones } };
  });
}
