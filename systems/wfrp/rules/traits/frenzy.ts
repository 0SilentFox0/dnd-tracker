import { conditionLevel } from '../conditions/levels';
import { wfrpState } from '../state';

import { inPlay } from '@/lib/utils/abilities/engine/core/participants';
import {
    footprint,
    footprintDistance,
    gridOf,
} from '@/lib/utils/battle/grid/geometry';
import { cellsOf, footprintSizeOf } from '@/lib/utils/battle/grid/occupancy';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridKind } from '@/types/battle-grid';

export const FRENZY_DAMAGE_BONUS = 1;

/** In a Frenzy until Stunned or down (p184); immune to other psychology meanwhile */
export const isFrenzied = (p: BattleParticipant): boolean =>
    wfrpState(p).frenzy === true &&
    inPlay(p) &&
    conditionLevel(p, 'stunned') === 0;

const distanceTo = (
    from: NonNullable<BattleParticipant['battleData']['position']>,
    size: number,
    foes: BattleParticipant[],
    grid: GridKind
): { distance: number; nearest: BattleParticipant[] } => {
    const cells = footprint(from, size, grid);

    const ds = foes.map((o) =>
        footprintDistance(cells, cellsOf(o, grid), grid)
    );

    const distance = ds.length ? Math.min(...ds) : Infinity;

    return { distance, nearest: foes.filter((_, i) => ds[i] === distance) };
};

const placedFoes = (
    ps: BattleParticipant[],
    p: BattleParticipant,
    map?: BattleMapConfig | null
) =>
    ps.filter(
        (o) =>
            o.basicInfo.id !== p.basicInfo.id &&
            inPlay(o) &&
            !!o.battleData.position &&
            isHostile(map, p, o)
    );

/** Foes at the shortest distance from a point (no positions = no answer): a Frenzied fighter attacks one of them (p184) */
export function nearestFoes(
    ps: BattleParticipant[],
    p: BattleParticipant,
    map?: BattleMapConfig | null,
    from = p.battleData.position
): BattleParticipant[] {
    const grid = gridOf(map);

    return from
        ? distanceTo(
              from,
              footprintSizeOf(p, grid),
              placedFoes(ps, p, map),
              grid
          ).nearest
        : [];
}

/** A Frenzied move must close in on the nearest foe, or keep next to it (p184) */
export function frenzyMoveAllowed(
    ps: BattleParticipant[],
    mover: BattleParticipant,
    start: NonNullable<BattleParticipant['battleData']['position']> | null,
    map?: BattleMapConfig | null
): boolean {
    const end = mover.battleData.position;

    if (!start || !end) return true;

    const foes = placedFoes(ps, mover, map);

    const grid = gridOf(map);

    const size = footprintSizeOf(mover, grid);

    const before = distanceTo(start, size, foes, grid).distance;

    const after = distanceTo(end, size, foes, grid).distance;

    return before === Infinity || after < before || (before <= 1 && after <= 1);
}
