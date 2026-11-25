import {
    findParticipant,
    isDormant,
    isTargetable,
} from '@/lib/utils/abilities/engine/core/participants';
import {
    bothOnMap,
    cellsOf,
    isAdjacentOnMap,
    isOnMap,
} from '@/lib/utils/battle/grid';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { hexNeighbors } from '@/lib/utils/battle/grid/hex';
import {
    isHostile,
    modeMeleeBlockedText,
} from '@/lib/utils/battle/modes/engine';
import type { BattleParticipant } from '@/types/battle';
import type { GridKind } from '@/types/battle-grid';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const FACINGS: GridPoint[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
];

function facingCells(at: GridPoint, { x: dx, y: dy }: GridPoint): GridPoint[] {
    if (dx === 0) return [-1, 0, 1].map((i) => ({ x: at.x + i, y: at.y + dy }));

    if (dy === 0) return [-1, 0, 1].map((i) => ({ x: at.x + dx, y: at.y + i }));

    return [
        { x: at.x + dx, y: at.y + dy },
        { x: at.x + dx, y: at.y },
        { x: at.x, y: at.y + dy },
    ];
}

function hexArcs(at: GridPoint): GridPoint[][] {
    const ring = hexNeighbors(at);

    return ring.map((n) => [
        n,
        ...hexNeighbors(n).filter((c) =>
            ring.some((r) => r.x === c.x && r.y === c.y)
        ),
    ]);
}

const touches = (p: BattleParticipant, cells: GridPoint[], grid: GridKind) =>
    cellsOf(p, grid).some((c) =>
        cells.some((f) => f.x === c.x && f.y === c.y)
    );

export function cleaveTargets(
    map: BattleMapConfig | null | undefined,
    order: BattleParticipant[],
    attacker: BattleParticipant,
    target: BattleParticipant,
    count: number
): BattleParticipant[] {
    if (count <= 0 || !bothOnMap(map, attacker, target)) return [];

    const grid = gridOf(map);

    const mine = cellsOf(attacker, grid);

    const primary = findParticipant(order, target.basicInfo.id) ?? target;

    const candidates = order.filter(
        (p) =>
            p.basicInfo.id !== target.basicInfo.id &&
            isHostile(map, attacker, p) &&
            isTargetable(p) &&
            !isDormant(p) &&
            isOnMap(p) &&
            isAdjacentOnMap(map, attacker, p) &&
            modeMeleeBlockedText(map, attacker, p) === null
    );

    if (mine.length !== 1) return candidates.slice(0, count);

    let best: BattleParticipant[] = [];

    const arcs =
        grid === 'hex'
            ? hexArcs(mine[0])
            : FACINGS.map((facing) => facingCells(mine[0], facing));

    for (const cells of arcs) {
        if (!touches(primary, cells, grid)) continue;

        const hit = candidates.filter((p) => touches(p, cells, grid));

        if (hit.length > best.length) best = hit;
    }

    return best.slice(0, count);
}
