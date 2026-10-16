import { resolveFlat } from "./amount";
import { auraKey } from "./collect-modifiers";
import { findParticipant, isActive, resolvedAbilitiesOf } from "./participants";
import { effectSource } from "./timed-effects";

import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { AREA_TARGETS, isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export type AreaTarget = (typeof AREA_TARGETS)[number];

export const isAreaTarget = (t: string | undefined): t is AreaTarget => (AREA_TARGETS as readonly string[]).includes(t ?? "");

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

  return ps.filter((p) => isActive(p) && (p.basicInfo.side === owner.basicInfo.side) === allies);
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

  return areaAuras(owner).filter((a) => zoneMembers(ps, ownerId, a.id).round !== round);
}

function resolvedEffect(e: StaticEffect, owner: BattleParticipant): StaticEffect {
  const out = { ...e, target: "self" } as StaticEffect;

  if ("flat" in out && out.flat !== undefined) (out as { flat: number }).flat = resolveFlat(out.flat, owner);

  if ("percent" in out && out.percent !== undefined) (out as { percent: number }).percent = resolveFlat(out.percent, owner);

  return out;
}

export class AuraZoneError extends Error {}

/** Нова зона аури: знімає попередню цього власника й накладає ефект на обраних. */
export function applyAuraZone(ps: BattleParticipant[], ownerId: string, auraId: string, targetIds: string[], round: number): BattleParticipant[] {
  const owner = findParticipant(ps, ownerId);

  const aura = owner && areaAuras(owner).find((a) => a.id === auraId);

  if (!owner || !aura) throw new AuraZoneError("Аура не знайдена");

  const allowed = new Set(zoneCandidates(ps, owner, aura.target).map((p) => p.basicInfo.id));

  if (targetIds.some((id) => !allowed.has(id))) throw new AuraZoneError("Ціль поза доступною стороною");

  const id = zoneEffectId(ownerId, auraId);

  const chosen = new Set(targetIds);

  const effect: ActiveEffect = {
    id,
    name: aura.ability.name,
    type: aura.target === "nearbyEnemies" ? "debuff" : "buff",
    duration: 1,
    permanent: true,
    appliedAt: { round, timestamp: new Date() },
    effects: [],
    abilityKey: id,
    abilityEffects: aura.effects.map((e) => resolvedEffect(e, owner)),
    source: effectSource(owner, aura.ability),
    zone: { ownerId, key: `${auraKey(aura.ability)}:${aura.target}` },
  };

  return ps.map((p) => {
    const rest = p.battleData.activeEffects.filter((e) => e.id !== id);

    const activeEffects = chosen.has(p.basicInfo.id) ? [...rest, effect] : rest;

    return activeEffects.length === p.battleData.activeEffects.length && !chosen.has(p.basicInfo.id) ? p : { ...p, battleData: { ...p.battleData, activeEffects } };
  });
}
