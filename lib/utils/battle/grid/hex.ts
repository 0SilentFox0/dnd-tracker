import type { GridPoint } from '@/types/battle-grid';

export interface Cube {
    x: number;
    y: number;
    z: number;
}

const UNIT = 100;

export const HEX_R = UNIT / 2;

export const HEX_H = Math.sqrt(3) * HEX_R;

const R = HEX_R;

const H = HEX_H;

export const CUBE_DIRS: readonly Cube[] = [
    { x: 1, y: -1, z: 0 },
    { x: 1, y: 0, z: -1 },
    { x: 0, y: 1, z: -1 },
    { x: -1, y: 1, z: 0 },
    { x: -1, y: 0, z: 1 },
    { x: 0, y: -1, z: 1 },
];

export function toCube(p: GridPoint): Cube {
    const z = p.y - (p.x - (p.x & 1)) / 2;

    return { x: p.x, y: -p.x - z, z };
}

export function fromCube(c: Cube): GridPoint {
    return { x: c.x, y: c.z + (c.x - (c.x & 1)) / 2 };
}

export function hexNeighbors(p: GridPoint): GridPoint[] {
    const c = toCube(p);

    return CUBE_DIRS.map((d) =>
        fromCube({ x: c.x + d.x, y: c.y + d.y, z: c.z + d.z })
    );
}

const cubeDistance = (a: Cube, b: Cube): number =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));

export function hexDistance(a: GridPoint, b: GridPoint): number {
    return cubeDistance(toCube(a), toCube(b));
}

export function cubeRound(c: Cube): Cube {
    let x = Math.round(c.x);

    let y = Math.round(c.y);

    let z = Math.round(c.z);

    const dx = Math.abs(x - c.x);

    const dy = Math.abs(y - c.y);

    const dz = Math.abs(z - c.z);

    if (dx > dy && dx > dz) x = -y - z;
    else if (dy > dz) y = -x - z;
    else z = -x - y;

    return { x, y, z };
}

export function hexLine(from: GridPoint, to: GridPoint): GridPoint[] {
    if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return [];

    const a = toCube({ x: Math.round(from.x), y: Math.round(from.y) });

    const b = toCube({ x: Math.round(to.x), y: Math.round(to.y) });

    const n = cubeDistance(a, b);

    if (n === 0) return [fromCube(a)];

    const nudge = (c: Cube): Cube => ({
        x: c.x + 1e-6,
        y: c.y + 2e-6,
        z: c.z - 3e-6,
    });

    const na = nudge(a);

    const nb = nudge(b);

    const out: GridPoint[] = [];

    for (let i = 0; i <= n; i++) {
        const t = i / n;

        out.push(
            fromCube(
                cubeRound({
                    x: na.x + (nb.x - na.x) * t,
                    y: na.y + (nb.y - na.y) * t,
                    z: na.z + (nb.z - na.z) * t,
                })
            )
        );
    }

    return out;
}

export function hexDisk(centre: GridPoint, radius: number): GridPoint[] {
    const c = toCube(centre);

    const out: GridPoint[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
        const lo = Math.max(-radius, -dx - radius);

        const hi = Math.min(radius, -dx + radius);

        for (let dy = lo; dy <= hi; dy++)
            out.push(fromCube({ x: c.x + dx, y: c.y + dy, z: c.z - dx - dy }));
    }

    return out;
}

export function hexRing(centre: GridPoint, radius: number): GridPoint[] {
    if (radius <= 0) return [centre];

    const c = toCube(centre);

    let cur: Cube = {
        x: c.x + CUBE_DIRS[4].x * radius,
        y: c.y + CUBE_DIRS[4].y * radius,
        z: c.z + CUBE_DIRS[4].z * radius,
    };

    const out: GridPoint[] = [];

    for (const d of CUBE_DIRS) {
        for (let i = 0; i < radius; i++) {
            out.push(fromCube(cur));
            cur = { x: cur.x + d.x, y: cur.y + d.y, z: cur.z + d.z };
        }
    }

    return out;
}

export function hexCenter(p: GridPoint): { x: number; y: number } {
    return { x: R + 1.5 * R * p.x, y: H * (p.y + 0.5 + 0.5 * (p.x & 1)) };
}

export function hexPolygon(p: GridPoint): string {
    const c = hexCenter(p);

    return [0, 1, 2, 3, 4, 5]
        .map((i) => {
            const a = (Math.PI / 3) * i;

            return `${(c.x + R * Math.cos(a)).toFixed(1)},${(c.y + R * Math.sin(a)).toFixed(1)}`;
        })
        .join(' ');
}

export function hexPointToCell(ux: number, uy: number): GridPoint {
    const px = ux - R;

    const py = uy - H / 2;

    const q = ((2 / 3) * px) / R;

    const r = ((-1 / 3) * px + (Math.sqrt(3) / 3) * py) / R;

    return fromCube(cubeRound({ x: q, y: -q - r, z: r }));
}

export function hexMapSize(
    cols: number,
    rows: number
): { width: number; height: number } {
    return {
        width: 1.5 * R * cols + 0.5 * R,
        height: H * (rows + (cols > 1 ? 0.5 : 0)),
    };
}

export function hexAwayStep(from: GridPoint, of: GridPoint): GridPoint {
    const a = toCube(from);

    const b = toCube(of);

    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };

    const n = cubeDistance(a, b);

    if (n === 0) return of;

    const f = { x: d.x / n, y: d.y / n, z: d.z / n };

    let x = Math.round(f.x);

    let y = Math.round(f.y);

    let z = Math.round(f.z);

    const diffs = {
        x: Math.abs(x - f.x),
        y: Math.abs(y - f.y),
        z: Math.abs(z - f.z),
    };

    const max = Math.max(diffs.x, diffs.y, diffs.z);

    const tied = (['x', 'y', 'z'] as const).filter(
        (k) => max - diffs[k] < 1e-9
    );

    const reset = tied.reduce((best, k) =>
        Math.abs(d[k]) > Math.abs(d[best]) ? k : best
    );

    if (reset === 'x') x = -y - z;
    else if (reset === 'y') y = -x - z;
    else z = -x - y;

    return fromCube({ x: b.x + x, y: b.y + y, z: b.z + z });
}
