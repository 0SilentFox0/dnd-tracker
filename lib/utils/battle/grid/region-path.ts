import { cellKey, parseCellKey } from './geometry';
import { HEX_R, hexCenter, hexNeighbors } from './hex';
import type { GridWindow } from './layout';
import { mapSize, unitOf } from './layout';

import type { GridKind, GridPoint } from '@/types/battle-grid';

const UNIT_1 = unitOf(1);

const f = (n: number) => Number(n.toFixed(1));

function hexCorners(p: GridPoint): Array<[number, number]> {
    const c = hexCenter(p);

    return [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (Math.PI / 3) * i;

        return [f(c.x + HEX_R * Math.cos(a)), f(c.y + HEX_R * Math.sin(a))];
    });
}

// edge i joins corners i and i+1; index into hexNeighbors of the cell across it
const EDGE_NEIGHBOR = [0, 5, 4, 3, 2, 1] as const;

export const hexEdgeNeighbor = (p: GridPoint, edge: number): GridPoint =>
    hexNeighbors(p)[EDGE_NEIGHBOR[edge]];

const hexRing = (corners: Array<[number, number]>) =>
    `M${corners.map(([x, y]) => `${x} ${y}`).join('L')}z`;

function hexOutline(keys: Set<string>): string {
    let d = '';

    for (const key of keys) {
        const p = parseCellKey(key);

        const corners = hexCorners(p);

        for (let i = 0; i < 6; i++) {
            if (keys.has(cellKey(hexEdgeNeighbor(p, i)))) continue;

            const [x0, y0] = corners[i];

            const [x1, y1] = corners[(i + 1) % 6];

            d += `M${x0} ${y0}L${x1} ${y1}`;
        }
    }

    return d;
}

export type Runs = Map<number, Array<[x0: number, x1: number]>>;

export function rowRuns(keys: Iterable<string>): Runs {
    const rows = new Map<number, number[]>();

    for (const key of keys) {
        const { x, y } = parseCellKey(key);

        const row = rows.get(y);

        if (row) row.push(x);
        else rows.set(y, [x]);
    }

    const runs: Runs = new Map();

    for (const y of [...rows.keys()].sort((a, b) => a - b)) {
        const xs = [...new Set(rows.get(y))].sort((a, b) => a - b);

        const list: Array<[number, number]> = [];

        for (const x of xs) {
            const last = list[list.length - 1];

            if (last && last[1] === x) last[1] = x + 1;
            else list.push([x, x + 1]);
        }

        runs.set(y, list);
    }

    return runs;
}

export function regionFillPath(
    keys: Iterable<string>,
    grid: GridKind = 'square'
): string {
    if (grid === 'hex') {
        let hex = '';

        for (const key of new Set(keys))
            hex += hexRing(hexCorners(parseCellKey(key)));

        return hex;
    }

    let d = '';

    for (const [y, list] of rowRuns(keys)) {
        for (const [x0, x1] of list)
            d += `M${x0 * UNIT_1} ${y * UNIT_1}h${(x1 - x0) * UNIT_1}v${UNIT_1}h-${(x1 - x0) * UNIT_1}z`;
    }

    return d;
}

function mergeEdges(edges: Map<number, number[]>): string[] {
    const out: string[] = [];

    for (const line of [...edges.keys()].sort((a, b) => a - b)) {
        const list = (edges.get(line) ?? []).sort((a, b) => a - b);

        let start = list[0];

        let prev = list[0];

        for (let i = 1; i <= list.length; i++) {
            if (i < list.length && list[i] === prev + 1) {
                prev = list[i];
                continue;
            }

            out.push(`${line}:${start}:${prev + 1}`);
            start = list[i];
            prev = list[i];
        }
    }

    return out;
}

export function regionOutlinePath(
    keys: Iterable<string>,
    grid: GridKind = 'square'
): string {
    const set = new Set(keys);

    if (grid === 'hex') return hexOutline(set);

    const horizontal = new Map<number, number[]>();

    const vertical = new Map<number, number[]>();

    const push = (m: Map<number, number[]>, line: number, at: number) => {
        const list = m.get(line);

        if (list) list.push(at);
        else m.set(line, [at]);
    };

    for (const key of set) {
        const { x, y } = parseCellKey(key);

        if (!set.has(`${x}:${y - 1}`)) push(horizontal, y, x);

        if (!set.has(`${x}:${y + 1}`)) push(horizontal, y + 1, x);

        if (!set.has(`${x - 1}:${y}`)) push(vertical, x, y);

        if (!set.has(`${x + 1}:${y}`)) push(vertical, x + 1, y);
    }

    let d = '';

    for (const seg of mergeEdges(horizontal)) {
        const [y, a, b] = seg.split(':').map(Number);

        d += `M${a * UNIT_1} ${y * UNIT_1}h${(b - a) * UNIT_1}`;
    }

    for (const seg of mergeEdges(vertical)) {
        const [x, a, b] = seg.split(':').map(Number);

        d += `M${x * UNIT_1} ${a * UNIT_1}v${(b - a) * UNIT_1}`;
    }

    return d;
}

function hexLinesPath(cols: number, rows: number): string {
    let d = '';

    const inside = (p: GridPoint) =>
        p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows;

    for (let x = 0; x < cols; x++)
        for (let y = 0; y < rows; y++) {
            const p = { x, y };

            const c = hexCorners(p);

            // each cell owns its S, SW and NW edges; edges owned by an off-map neighbour are added here
            d += `M${c[1][0]} ${c[1][1]}L${c[2][0]} ${c[2][1]}L${c[3][0]} ${c[3][1]}L${c[4][0]} ${c[4][1]}`;

            for (const edge of [0, 4, 5]) {
                if (inside(hexEdgeNeighbor(p, edge))) continue;

                const [x0, y0] = c[edge];

                const [x1, y1] = c[(edge + 1) % 6];

                d += `M${x0} ${y0}L${x1} ${y1}`;
            }
        }

    return d;
}

export function gridLinesPath(
    cols: number,
    rows: number,
    grid: GridKind = 'square'
): string {
    if (grid === 'hex') return hexLinesPath(cols, rows);

    let d = '';

    for (let y = 0; y <= rows; y++) d += `M0 ${y * UNIT_1}H${cols * UNIT_1}`;

    for (let x = 0; x <= cols; x++) d += `M${x * UNIT_1} 0V${rows * UNIT_1}`;

    return d;
}

const rectPath = (x: number, y: number, w: number, h: number): string =>
    `M${x * UNIT_1} ${y * UNIT_1}h${w * UNIT_1}v${h * UNIT_1}h-${w * UNIT_1}z`;

export function windowPath(
    map: { cols: number; rows: number },
    win: GridWindow,
    grid: GridKind = 'square'
): string {
    if (grid === 'hex') {
        const { width, height } = mapSize(map, grid);

        const outer = `M0 0h${width}v${height}h-${width}z`;

        return win.cells?.length
            ? outer + regionFillPath(win.cells, grid)
            : outer;
    }

    return (
        rectPath(0, 0, map.cols, map.rows) +
        rectPath(win.x, win.y, win.cols, win.rows)
    );
}
