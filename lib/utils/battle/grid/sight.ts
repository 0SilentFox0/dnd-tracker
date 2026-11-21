import { cellsConnected, wallsOf } from './edges';
import { cellsOf, isOnMap } from './occupancy';

import { modeSightedTargets } from '@/lib/utils/battle/modes/engine';
import {
    sightBlockingCells,
    zonesAllowSight,
} from '@/lib/utils/battle/vision/shadowcast';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

function allowSight(
    map: BattleMapConfig,
    walls: ReadonlySet<string>,
    blocking: ReadonlySet<string>,
    viewer: BattleParticipant,
    target: BattleParticipant
): boolean {
    if (!walls.size && !blocking.size) return true;

    if (!isOnMap(viewer) || !isOnMap(target)) return true;

    const from = cellsOf(viewer);

    const to = cellsOf(target);

    if (!zonesAllowSight(map, from, to, blocking)) return false;

    return !walls.size || cellsConnected(map, 'sight', from, to);
}

export function wallsAllowSight(
    map: BattleMapConfig | null | undefined,
    viewer: BattleParticipant,
    target: BattleParticipant
): boolean {
    if (!map) return true;

    return allowSight(
        map,
        wallsOf(map),
        sightBlockingCells(map),
        viewer,
        target
    );
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

    if (!map) return sighted;

    const walls = wallsOf(map);

    const blocking = sightBlockingCells(map);

    if (!walls.size && !blocking.size) return sighted;

    const byId = new Map(ps.map((p) => [p.basicInfo.id, p]));

    return sighted.filter((id) => {
        const p = byId.get(id);

        return !p || allowSight(map, walls, blocking, caster, p);
    });
}
