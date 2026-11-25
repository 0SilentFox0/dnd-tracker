import { edgeBlocks } from '@/lib/utils/battle/grid/edges';
import {
    cellKey,
    gridOf,
    inBounds,
} from '@/lib/utils/battle/grid/geometry';
import { hexDistance, hexLine } from '@/lib/utils/battle/grid/hex';
import type {
    BattleMapConfig,
    GridKind,
    GridPoint,
} from '@/types/battle-grid';

const MAX_RADIUS = 40;

export function gridRay(
    from: GridPoint,
    to: GridPoint,
    grid: GridKind = 'square'
): GridPoint[] {
    if (grid === 'hex') return hexLine(from, to);

    const dx = Math.abs(to.x - from.x);

    const dy = Math.abs(to.y - from.y);

    const sx = Math.sign(to.x - from.x);

    const sy = Math.sign(to.y - from.y);

    const cells = [{ ...from }];

    let { x, y } = from;

    let ix = 0;

    let iy = 0;

    while (ix < dx || iy < dy) {
        const xCrossing = ix < dx ? (2 * ix + 1) * dy : Infinity;

        const yCrossing = iy < dy ? (2 * iy + 1) * dx : Infinity;

        if (xCrossing < yCrossing) {
            x += sx;
            ix++;
        } else if (yCrossing < xCrossing) {
            y += sy;
            iy++;
        } else {
            x += sx;
            y += sy;
            ix++;
            iy++;
        }

        cells.push({ x, y });
    }

    return cells;
}

function lineVisible(
    map: BattleMapConfig,
    from: GridPoint,
    to: GridPoint,
    opaque: ReadonlySet<string>
): boolean {
    const line = gridRay(from, to, gridOf(map));

    for (let index = 1; index < line.length; index++) {
        const previous = line[index - 1];

        const current = line[index];

        if (edgeBlocks(map, previous, current, 'sight')) return false;

        if (index < line.length - 1 && opaque.has(cellKey(current)))
            return false;
    }

    return true;
}

/** Returns cells with unobstructed, direction-independent centre-to-centre sight. */
export function visibleFrom(
    map: BattleMapConfig,
    source: GridPoint,
    radius: number,
    tileBlocksSight: ReadonlySet<string> = new Set()
): Set<string> {
    return visibleFromWith(map, source, radius, opaqueCells(map, tileBlocksSight));
}

function opaqueCells(
    map: BattleMapConfig,
    tileBlocksSight: ReadonlySet<string>
): Set<string> {
    const opaque = new Set(tileBlocksSight);

    for (const [key, terrain] of Object.entries(map.terrain ?? {}))
        if (terrain.obscured || terrain.blocksSight) opaque.add(key);

    return opaque;
}

function visibleFromWith(
    map: BattleMapConfig,
    source: GridPoint,
    radius: number,
    opaque: ReadonlySet<string>
): Set<string> {
    const visible = new Set<string>();

    if (!inBounds(map, source)) return visible;

    const boundedRadius = Math.max(0, Math.min(MAX_RADIUS, Math.floor(radius)));

    const hex = gridOf(map) === 'hex';

    const rowSpan = hex ? Math.ceil(boundedRadius * 1.5) + 1 : boundedRadius;

    for (
        let y = Math.max(0, source.y - rowSpan);
        y <= Math.min(map.rows - 1, source.y + rowSpan);
        y++
    ) {
        for (
            let x = Math.max(0, source.x - boundedRadius);
            x <= Math.min(map.cols - 1, source.x + boundedRadius);
            x++
        ) {
            const target = { x, y };

            const dx = x - source.x;

            const dy = y - source.y;

            if (
                hex
                    ? hexDistance(source, target) > boundedRadius
                    : dx * dx + dy * dy > boundedRadius * boundedRadius
            )
                continue;

            if (
                lineVisible(map, source, target, opaque) &&
                lineVisible(map, target, source, opaque)
            )
                visible.add(cellKey(target));
        }
    }

    return visible;
}

export function visibleFromMany(
    map: BattleMapConfig,
    sources: readonly GridPoint[],
    radius: number,
    tileBlocksSight: ReadonlySet<string> = new Set()
): Set<string> {
    const visible = new Set<string>();

    const opaque = opaqueCells(map, tileBlocksSight);

    for (const source of sources)
        for (const cell of visibleFromWith(map, source, radius, opaque))
            visible.add(cell);

    return visible;
}

const EMPTY_KEYS: ReadonlySet<string> = new Set();

export function sightBlockingCells(
    map: Pick<BattleMapConfig, 'terrain'>
): ReadonlySet<string> {
    const keys = Object.keys(map.terrain ?? {}).filter(
        (k) => map.terrain?.[k].blocksSight
    );

    return keys.length ? new Set(keys) : EMPTY_KEYS;
}

export function zonesAllowSight(
    map: Pick<BattleMapConfig, 'terrain' | 'gridType'>,
    from: readonly GridPoint[],
    to: readonly GridPoint[],
    blocking: ReadonlySet<string> = sightBlockingCells(map)
): boolean {
    if (!blocking.size) return true;

    const grid = gridOf(map);

    return from.some((a) =>
        to.some((b) => {
            const line = gridRay(a, b, grid);

            for (let i = 1; i < line.length - 1; i++)
                if (blocking.has(cellKey(line[i]))) return false;

            return true;
        })
    );
}
