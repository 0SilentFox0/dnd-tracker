import { CUBE_DIRS, cubeStep, fromCube, HEX_R, hexVertices, toCube } from './hex';

import type { GridKind, GridPoint } from '@/types/battle-grid';

export type SquareSide = 'e' | 's';
export type HexSide = 'n' | 'ne' | 'se';
export type EdgeSide = SquareSide | HexSide;
export type SquareDir = 'n' | 'e' | 's' | 'w';
export type HexDir = 'n' | 'ne' | 'se' | 's' | 'sw' | 'nw';
export interface EdgeParts {
    a: GridPoint;
    b: GridPoint;
    side: EdgeSide;
    grid: GridKind;
}
export type Point = { x: number; y: number };

const UNIT = 2 * HEX_R;

const SQUARE: readonly EdgeSide[] = ['e', 's'];

const HEX: readonly EdgeSide[] = ['n', 'ne', 'se'];

const HEX_DIR_INDEX: Record<HexDir, number> = { se: 0, ne: 1, n: 2, nw: 3, sw: 4, s: 5 };

const HEX_OPPOSITE: Record<'s' | 'sw' | 'nw', HexSide> = { s: 'n', sw: 'ne', nw: 'se' };

const HEX_VERTS: Record<HexSide, [number, number]> = { n: [4, 5], ne: [5, 0], se: [0, 1] };

const ALL_DIRS: Record<GridKind, readonly (SquareDir | HexDir)[]> = {
    hex: ['n', 'ne', 'se', 's', 'sw', 'nw'],
    square: ['n', 'e', 's', 'w'],
};

const hexStep = (p: GridPoint, dir: HexDir): GridPoint =>
    fromCube(cubeStep(toCube(p), CUBE_DIRS[HEX_DIR_INDEX[dir]]));

export const edgeSidesOf = (grid: GridKind): readonly EdgeSide[] =>
    grid === 'hex' ? HEX : SQUARE;

export const formatEdge = (c: GridPoint, side: EdgeSide): string => `${c.x}:${c.y}:${side}`;

export function edgeGridOf(key: string): GridKind | null {
    const side = key.split(':')[2];

    if (SQUARE.includes(side as EdgeSide)) return 'square';

    if (HEX.includes(side as EdgeSide)) return 'hex';

    return null;
}

export function parseEdge(key: string): EdgeParts | null {
    const [xs, ys, side] = key.split(':');

    const grid = edgeGridOf(key);

    const a = { x: Number(xs), y: Number(ys) };

    if (!grid || !Number.isInteger(a.x) || !Number.isInteger(a.y)) return null;

    const b =
        grid === 'square'
            ? side === 'e'
                ? { x: a.x + 1, y: a.y }
                : { x: a.x, y: a.y + 1 }
            : hexStep(a, side as HexDir);

    return { a, b, side: side as EdgeSide, grid };
}

export const edgeOnGrid = (grid: GridKind, key: string): boolean =>
    edgeGridOf(key) === grid && parseEdge(key) !== null;

export function canonicalEdge(grid: GridKind, cell: GridPoint, dir: SquareDir | HexDir): string {
    if (grid === 'square') {
        if (dir === 'e' || dir === 's') return formatEdge(cell, dir);

        return dir === 'w'
            ? formatEdge({ x: cell.x - 1, y: cell.y }, 'e')
            : formatEdge({ x: cell.x, y: cell.y - 1 }, 's');
    }

    const d = dir as HexDir;

    if (d === 'n' || d === 'ne' || d === 'se') return formatEdge(cell, d);

    return formatEdge(hexStep(cell, d), HEX_OPPOSITE[d]);
}

export function edgeKeyBetween(grid: GridKind, a: GridPoint, b: GridPoint): string | null {
    for (const dir of ALL_DIRS[grid]) {
        const n =
            grid === 'hex'
                ? hexStep(a, dir as HexDir)
                : {
                      x: a.x + (dir === 'e' ? 1 : dir === 'w' ? -1 : 0),
                      y: a.y + (dir === 's' ? 1 : dir === 'n' ? -1 : 0),
                  };

        if (n.x === b.x && n.y === b.y) return canonicalEdge(grid, a, dir);
    }

    return null;
}

export function edgeCellsOf(grid: GridKind, key: string): [GridPoint, GridPoint] {
    const e = parseEdge(key);

    if (!e || e.grid !== grid) throw new Error(`edge ${key} is not a ${grid} edge`);

    return [e.a, e.b];
}

export function edgeSegment(grid: GridKind, key: string): [Point, Point] {
    const e = parseEdge(key);

    if (!e || e.grid !== grid) throw new Error(`edge ${key} is not a ${grid} edge`);

    if (grid === 'hex') {
        const v = hexVertices(e.a);

        const [i, j] = HEX_VERTS[e.side as HexSide];

        return [v[i], v[j]];
    }

    const { x, y } = e.a;

    return e.side === 'e'
        ? [
              { x: (x + 1) * UNIT, y: y * UNIT },
              { x: (x + 1) * UNIT, y: (y + 1) * UNIT },
          ]
        : [
              { x: x * UNIT, y: (y + 1) * UNIT },
              { x: (x + 1) * UNIT, y: (y + 1) * UNIT },
          ];
}

export function edgesOfCell(grid: GridKind, cell: GridPoint): string[] {
    return ALL_DIRS[grid].map((d) => canonicalEdge(grid, cell, d));
}
