import { cellsConnected, wallsOf } from './edges';
import { cellsOf, isOnMap } from './occupancy';

import { modeSightedTargets } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

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

/** Точка прицілу шаблону має бути досяжна для заклинателя крізь стіни (як лінія вогню). */
export function wallsAllowAim(
    map: BattleMapConfig | null | undefined,
    caster: BattleParticipant,
    aim: GridPoint
): boolean {
    if (!map || !wallsOf(map).size || !isOnMap(caster)) return true;

    return cellsConnected(map, 'fire', cellsOf(caster), [aim]);
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
