import { cellsConnected, wallsOf } from './edges';
import { cellsOf, isOnMap } from './occupancy';

import { modeSightedTargets } from '@/lib/utils/battle/modes/engine';
import {
    sightBlockingCells,
    zonesAllowSight,
} from '@/lib/utils/battle/vision/shadowcast';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

export function wallsAllowSight(
    map: BattleMapConfig | null | undefined,
    viewer: BattleParticipant,
    target: BattleParticipant
): boolean {
    if (!map) return true;

    if (!isOnMap(viewer) || !isOnMap(target)) return true;

    const from = cellsOf(viewer);

    const to = cellsOf(target);

    if (!zonesAllowSight(map, from, to)) return false;

    return !wallsOf(map).size || cellsConnected(map, 'sight', from, to);
}

export function wallsAllowAim(
    map: BattleMapConfig | null | undefined,
    caster: BattleParticipant,
    aim: GridPoint
): boolean {
    if (!map || !wallsOf(map).size || !isOnMap(caster)) return true;

    return cellsConnected(map, 'fire', cellsOf(caster), [aim]);
}

export function sightedTargets(
    map: BattleMapConfig | null | undefined,
    ps: BattleParticipant[],
    caster: BattleParticipant,
    ids: string[]
): string[] {
    const sighted = modeSightedTargets(map, ps, caster, ids);

    if (!map || (!wallsOf(map).size && !sightBlockingCells(map).size))
        return sighted;

    const byId = new Map(ps.map((p) => [p.basicInfo.id, p]));

    return sighted.filter((id) => {
        const p = byId.get(id);

        return !p || wallsAllowSight(map, caster, p);
    });
}
