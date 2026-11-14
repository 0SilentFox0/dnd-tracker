import { parseCellKey } from './geometry';
import type { GridWindow } from './layout';
import { UNIT } from './layout';

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

export function regionFillPath(keys: Iterable<string>): string {
    let d = '';

    for (const [y, list] of rowRuns(keys)) {
        for (const [x0, x1] of list)
            d += `M${x0 * UNIT} ${y * UNIT}h${(x1 - x0) * UNIT}v${UNIT}h-${(x1 - x0) * UNIT}z`;
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

export function regionOutlinePath(keys: Iterable<string>): string {
    const set = new Set(keys);

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

        d += `M${a * UNIT} ${y * UNIT}h${(b - a) * UNIT}`;
    }

    for (const seg of mergeEdges(vertical)) {
        const [x, a, b] = seg.split(':').map(Number);

        d += `M${x * UNIT} ${a * UNIT}v${(b - a) * UNIT}`;
    }

    return d;
}

export function gridLinesPath(cols: number, rows: number): string {
    let d = '';

    for (let y = 0; y <= rows; y++) d += `M0 ${y * UNIT}H${cols * UNIT}`;

    for (let x = 0; x <= cols; x++) d += `M${x * UNIT} 0V${rows * UNIT}`;

    return d;
}

const rectPath = (x: number, y: number, w: number, h: number): string =>
    `M${x * UNIT} ${y * UNIT}h${w * UNIT}v${h * UNIT}h-${w * UNIT}z`;

export function windowPath(
    map: { cols: number; rows: number },
    win: GridWindow
): string {
    return (
        rectPath(0, 0, map.cols, map.rows) +
        rectPath(win.x, win.y, win.cols, win.rows)
    );
}
