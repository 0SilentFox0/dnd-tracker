import {
    edgeSidesOf,
    formatEdge,
    parseEdge,
} from '@/lib/utils/battle/grid/edge-keys';
import {
    CHUNK_SIDE,
    chunkKey,
    parseChunkKey,
} from '@/lib/utils/battle/map-storage/chunk-key';
import { toBase64 } from '@/lib/utils/common/base64';
import type { GridKind } from '@/types/battle-grid';

const HEX_VERSION = 2;

function layoutOf(grid: GridKind) {
    const sides = edgeSidesOf(grid);

    const header = grid === 'hex' ? 1 : 0;

    return {
        sides,
        header,
        bytes: header + (CHUNK_SIDE * CHUNK_SIDE * sides.length * 2) / 8,
    };
}

const CHUNK_BYTES = layoutOf('square').bytes;

export const EMPTY_EDGE_CHUNK = toBase64(new Uint8Array(CHUNK_BYTES));

const KIND_WALL = 1;

const KIND_BAR = 2;

export type EdgeChunks = Record<string, string>;

export interface EdgeSets {
    walls: string[];
    bars: string[];
}

export class EdgeChunkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EdgeChunkError';
    }
}

function slot(x: number, y: number, side: string, grid: GridKind): number {
    const sides = layoutOf(grid).sides;

    return (
        ((y % CHUNK_SIDE) * CHUNK_SIDE + (x % CHUNK_SIDE)) * sides.length +
        sides.indexOf(side as (typeof sides)[number])
    );
}

function fromBase64(value: string, key: string, grid: GridKind): Uint8Array {
    let bin: string;

    try {
        bin = atob(value);
    } catch {
        throw new EdgeChunkError(`chunk ${key}: invalid base64`);
    }

    const layout = layoutOf(grid);

    const other = layoutOf(grid === 'hex' ? 'square' : 'hex').bytes;

    if (bin.length === other) {
        throw new EdgeChunkError(`chunk ${key}: format does not match grid`);
    }

    if (bin.length !== layout.bytes) {
        throw new EdgeChunkError(
            `chunk ${key}: expected ${layout.bytes} bytes, got ${bin.length}`
        );
    }

    if (layout.header && bin.charCodeAt(0) !== HEX_VERSION) {
        throw new EdgeChunkError(`chunk ${key}: format does not match grid`);
    }

    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function newChunk(grid: GridKind): Uint8Array {
    const bytes = new Uint8Array(layoutOf(grid).bytes);

    if (grid === 'hex') bytes[0] = HEX_VERSION;

    return bytes;
}

function locate(edge: string, grid: GridKind) {
    const parsed = parseEdge(edge);

    if (!parsed || parsed.grid !== grid) {
        throw new EdgeChunkError(`invalid edge key: ${edge}`);
    }

    const { a, side } = parsed;

    const key = chunkKey(
        Math.floor(a.x / CHUNK_SIDE),
        Math.floor(a.y / CHUNK_SIDE)
    );

    const idx = slot(a.x, a.y, side, grid);

    return { a, key, idx, byte: layoutOf(grid).header + (idx >> 2) };
}

function put(
    chunks: Map<string, Uint8Array>,
    edge: string,
    kind: number,
    cols: number,
    rows: number,
    grid: GridKind
) {
    const { a, key, idx, byte } = locate(edge, grid);

    if (a.x < 0 || a.y < 0 || a.x >= cols || a.y >= rows) return;

    let bytes = chunks.get(key);

    if (!bytes) {
        bytes = newChunk(grid);
        chunks.set(key, bytes);
    }

    bytes[byte] |= kind << ((idx & 3) * 2);
}

export function encodeEdges(
    edges: Partial<EdgeSets>,
    cols: number,
    rows: number,
    grid: GridKind = 'square'
): EdgeChunks {
    const chunks = new Map<string, Uint8Array>();

    const { header } = layoutOf(grid);

    for (const e of edges.bars ?? [])
        put(chunks, e, KIND_BAR, cols, rows, grid);

    for (const e of edges.walls ?? []) {
        const { key, idx, byte } = locate(e, grid);

        const bytes = chunks.get(key);

        if (bytes) bytes[byte] &= ~(3 << ((idx & 3) * 2));

        put(chunks, e, KIND_WALL, cols, rows, grid);
    }

    const out: EdgeChunks = {};

    const keys = [...chunks.keys()].sort((p, q) => {
        const [px, py] = p.split(':').map(Number);

        const [qx, qy] = q.split(':').map(Number);

        return py - qy || px - qx;
    });

    for (const key of keys) {
        const bytes = chunks.get(key);

        if (bytes && bytes.slice(header).some((b) => b !== 0))
            out[key] = toBase64(bytes);
    }

    return out;
}

export function decodeEdges(
    chunks: EdgeChunks,
    cols: number,
    rows: number,
    grid: GridKind = 'square'
): EdgeSets {
    const { sides, header } = layoutOf(grid);

    const n = sides.length;

    type Found = { x: number; y: number; side: number };

    const walls: Found[] = [];

    const bars: Found[] = [];

    for (const [key, value] of Object.entries(chunks)) {
        const parsed = parseChunkKey(key);

        if (!parsed) throw new EdgeChunkError(`invalid chunk key ${key}`);

        const { cx, cy } = parsed;

        const bytes = fromBase64(value, key, grid);

        for (let idx = 0; idx < CHUNK_SIDE * CHUNK_SIDE * n; idx++) {
            const kind = (bytes[header + (idx >> 2)] >> ((idx & 3) * 2)) & 3;

            if (kind === 0) continue;

            if (kind === 3)
                throw new EdgeChunkError(`chunk ${key}: reserved edge kind`);

            const cell = Math.floor(idx / n);

            const x = cx * CHUNK_SIDE + (cell % CHUNK_SIDE);

            const y = cy * CHUNK_SIDE + Math.floor(cell / CHUNK_SIDE);

            if (x >= cols || y >= rows) {
                throw new EdgeChunkError(
                    `chunk ${key}: edge outside ${cols}x${rows} grid`
                );
            }

            (kind === KIND_WALL ? walls : bars).push({ x, y, side: idx % n });
        }
    }

    const order = (p: Found, q: Found) =>
        p.y - q.y || p.x - q.x || p.side - q.side;

    const str = (e: Found) => formatEdge(e, sides[e.side]);

    return {
        walls: walls.sort(order).map(str),
        bars: bars.sort(order).map(str),
    };
}
