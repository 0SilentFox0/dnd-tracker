import { areaAuras, auraZoneEffect, zoneCandidates } from "./area-aura";

import { AURA_RADIUS_CELLS } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import type { ActiveEffect, BattleMapConfig, BattleParticipant } from "@/types/battle";

/** Область-аури на карті: склад зони — живі в радіусі; власник без позиції лишається в ручному режимі. */
export function syncMapAuras(participants: BattleParticipant[], map: BattleMapConfig | null): BattleParticipant[] {
  if (!map) return participants;

  const managed = new Set<string>();

  const wanted = new Map<string, ActiveEffect[]>();

  for (const owner of participants) {
    const ownerId = owner.basicInfo.id;

    if (!isActive(owner) || owner.battleData.dormant || owner.battleData.escaped) {
      managed.add(ownerId);

      continue;
    }

    if (!isOnMap(owner)) continue;

    managed.add(ownerId);

    const ownerCells = cellsOf(owner);

    for (const aura of areaAuras(owner)) {
      const round = owner.battleData.auraZones?.[aura.id] ?? 1;

      const effect = auraZoneEffect(owner, aura, round);

      for (const m of zoneCandidates(participants, owner, aura.target)) {
        if (!isOnMap(m) || footprintDistance(ownerCells, cellsOf(m)) > AURA_RADIUS_CELLS) continue;

        const id = m.basicInfo.id;

        wanted.set(id, [...(wanted.get(id) ?? []), effect]);
      }
    }
  }

  let changed = false;

  const out = participants.map((p) => {
    const want = wanted.get(p.basicInfo.id) ?? [];

    const wantIds = new Set(want.map((e) => e.id));

    const have = new Set(p.battleData.activeEffects.map((e) => e.id));

    const stale = p.battleData.activeEffects.some((e) => e.zone && managed.has(e.zone.ownerId) && !wantIds.has(e.id));

    const missing = want.filter((e) => !have.has(e.id));

    if (!stale && !missing.length) return p;

    changed = true;

    const kept = p.battleData.activeEffects.filter((e) => !(e.zone && managed.has(e.zone.ownerId) && !wantIds.has(e.id)));

    return { ...p, battleData: { ...p.battleData, activeEffects: [...kept, ...missing] } };
  });

  return changed ? out : participants;
}
