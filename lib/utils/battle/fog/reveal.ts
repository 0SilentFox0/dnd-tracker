import { normalizeRevealedRuns } from '@/lib/utils/battle/fog/revealed-runs';
import { edgeBlocks } from '@/lib/utils/battle/grid/edges';
import {
    cellKey,
    inBounds,
    orthoNeighbors,
} from '@/lib/utils/battle/grid/geometry';
import type {
    BattleMapConfig,
    GridPoint,
    RevealedRun,
} from '@/types/battle-grid';

/** Four-neighbour flood fill bounded by map cells and movement-blocking edges. */
export function floodRoom({
    map,
    start,
    blocked = new Set<string>(),
}: {
    map: BattleMapConfig;
    start: GridPoint;
    blocked?: ReadonlySet<string>;
}): Set<string> {
    if (!inBounds(map, start)) return new Set();

    const blockedCells = new Set([
        ...(map.blocked ?? []),
        ...Object.entries(map.terrain ?? {})
            .filter(
                ([, terrain]) =>
                    terrain.kind === 'wall' || terrain.kind === 'barrier'
            )
            .map(([key]) => key),
        ...blocked,
    ]);

    const first = cellKey(start);

    if (blockedCells.has(first)) return new Set();

    const visited = new Set<string>([first]);

    const queue: GridPoint[] = [start];

    for (let index = 0; index < queue.length; index++) {
        const current = queue[index];

        for (const next of orthoNeighbors(map, current)) {
            const key = cellKey(next);

            if (
                visited.has(key) ||
                blockedCells.has(key) ||
                edgeBlocks(map, current, next, 'move')
            )
                continue;

            visited.add(key);
            queue.push(next);
        }
    }

    return visited;
}

/** Encodes in-bounds, unblocked cells into sorted compact row intervals. */
export function revealCells(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'blocked'>,
    cells: Iterable<GridPoint>,
    blocked: ReadonlySet<string> = new Set()
): RevealedRun[] {
    const mapBlocked = new Set(map.blocked);

    const runs = [...cells]
        .filter(
            (cell) =>
                inBounds(map, cell) &&
                !mapBlocked.has(cellKey(cell)) &&
                !blocked.has(cellKey(cell))
        )
        .map(({ x, y }) => [y, x, x + 1] as const);

    return normalizeRevealedRuns(runs, map);
}

/** Inclusive corner rectangle, clipped to map bounds and caller-blocked cells. */
export function revealRectangle(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'blocked'>,
    from: GridPoint,
    to: GridPoint,
    blocked: ReadonlySet<string> = new Set()
): RevealedRun[] {
    const minX = Math.max(0, Math.min(from.x, to.x));

    const maxX = Math.min(map.cols - 1, Math.max(from.x, to.x));

    const minY = Math.max(0, Math.min(from.y, to.y));

    const maxY = Math.min(map.rows - 1, Math.max(from.y, to.y));

    const rows: RevealedRun[] = [];

    const mapBlocked = new Set(map.blocked);

    for (let y = minY; y <= maxY; y++) {
        let start: number | null = null;

        for (let x = minX; x <= maxX + 1; x++) {
            const key = cellKey({ x, y });

            const allowed =
                x <= maxX && !mapBlocked.has(key) && !blocked.has(key);

            if (allowed && start === null) start = x;

            if (!allowed && start !== null) {
                rows.push([y, start, x]);
                start = null;
            }
        }
    }

    return rows;
}
