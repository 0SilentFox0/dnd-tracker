import { cellsConnected, wallsOf } from './edges';
import { cellsOf, isOnMap } from './occupancy';

import { modeSightedTargets } from '@/lib/utils/battle/modes/engine';
import type { BattleMapConfig, BattleParticipant } from '@/types/battle';

/** Core-видимість: стіни карти не перекривають лінію між жодною парою клітинок обох учасників. */
export function wallsAllowSight(
    map: BattleMapConfig | null | undefined,
    viewer: BattleParticipant,
    target: BattleParticipant
): boolean {
    if (!map || !wallsOf(map).size) return true;

    if (!isOnMap(viewer) || !isOnMap(target)) return true;

    return cellsConnected(map, 'sight', cellsOf(viewer), cellsOf(target));
}

/** `modeSightedTargets` плюс стіни карти. */
export function sightedTargets(
    map: BattleMapConfig | null | undefined,
    ps: BattleParticipant[],
    caster: BattleParticipant,
    ids: string[]
): string[] {
    const sighted = modeSightedTargets(map, ps, caster, ids);

    if (!map || !wallsOf(map).size) return sighted;

    const byId = new Map(ps.map((p) => [p.basicInfo.id, p]));

    return sighted.filter((id) => {
        const p = byId.get(id);

        return !p || wallsAllowSight(map, caster, p);
    });
}
