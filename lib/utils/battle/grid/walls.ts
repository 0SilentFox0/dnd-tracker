import type { EdgeSide } from './edge-keys';
import { edgeKeyBetween, formatEdge, parseEdge } from './edge-keys';
import { gridOf, inBounds, neighbors } from './geometry';
import { hexDistance } from './hex';

import type { GridKind, GridPoint } from '@/types/battle-grid';

export type GridSize = { cols: number; rows: number; gridType?: GridKind };

const EMPTY_SET: ReadonlySet<string> = new Set();

const wallCache = new WeakMap<string[], Set<string>>();

export function wallSet(list?: string[]): ReadonlySet<string> {
    if (!list?.length) return EMPTY_SET;

    let set = wallCache.get(list);

    if (!set) {
        set = new Set(list);
        wallCache.set(list, set);
    }

    return set;
}

export const formatEdgeKey = (p: GridPoint, side: EdgeSide): string =>
    formatEdge(p, side);

export function edgeKey(
    a: GridPoint,
    b: GridPoint,
    grid: GridKind = 'square'
): string | null {
    return edgeKeyBetween(grid, a, b);
}

export interface ParsedEdge {
    a: GridPoint;
    b: GridPoint;
    side: EdgeSide;
}

export function parseEdgeKey(edge: string): ParsedEdge {
    const parsed = parseEdge(edge);

    if (parsed) return { a: parsed.a, b: parsed.b, side: parsed.side };

    const [x, y] = edge.split(':');

    const a = { x: Number(x), y: Number(y) };

    return { a, b: { x: a.x, y: a.y + 1 }, side: 's' };
}

export function edgeCells(edge: string): [GridPoint, GridPoint] {
    const { a, b } = parseEdgeKey(edge);

    return [a, b];
}

export function hasWall(
    grid: GridSize,
    walls: ReadonlySet<string>,
    a: GridPoint,
    b: GridPoint
): boolean {
    if (!inBounds(grid, a) || !inBounds(grid, b)) return true;

    const key = edgeKey(a, b, gridOf(grid));

    return key !== null && walls.has(key);
}

export function cornerOpen(
    grid: GridSize,
    walls: ReadonlySet<string>,
    a: GridPoint,
    b: GridPoint
): boolean {
    const ax = { x: b.x, y: a.y };

    const ay = { x: a.x, y: b.y };

    return (
        !hasWall(grid, walls, a, ax) &&
        !hasWall(grid, walls, a, ay) &&
        !hasWall(grid, walls, ax, b) &&
        !hasWall(grid, walls, ay, b)
    );
}

export function canStep(
    grid: GridSize,
    walls: ReadonlySet<string>,
    a: GridPoint,
    b: GridPoint
): boolean {
    if (gridOf(grid) === 'hex') {
        return hexDistance(a, b) === 1 && !hasWall(grid, walls, a, b);
    }

    const dx = Math.abs(b.x - a.x);

    const dy = Math.abs(b.y - a.y);

    if (dx > 1 || dy > 1 || dx + dy === 0) return false;

    if (dx + dy === 1) return !hasWall(grid, walls, a, b);

    return (
        inBounds(grid, a) && inBounds(grid, b) && cornerOpen(grid, walls, a, b)
    );
}

export function isEdgeCell(grid: GridSize, p: GridPoint): boolean {
    return (
        p.x === 0 || p.y === 0 || p.x === grid.cols - 1 || p.y === grid.rows - 1
    );
}

export function allInteriorEdges(grid: GridSize): string[] {
    const out: string[] = [];

    for (let y = 0; y < grid.rows; y++) {
        for (let x = 0; x < grid.cols; x++) {
            if (x < grid.cols - 1) out.push(formatEdgeKey({ x, y }, 'e'));

            if (y < grid.rows - 1) out.push(formatEdgeKey({ x, y }, 's'));
        }
    }

    return out;
}

export function mazeNeighbors(
    grid: GridSize,
    walls: ReadonlySet<string>,
    p: GridPoint
): GridPoint[] {
    return neighbors(p).filter((n) => canStep(grid, walls, p, n));
}
