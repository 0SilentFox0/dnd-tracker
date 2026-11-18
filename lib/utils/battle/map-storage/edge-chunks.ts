import { formatEdgeKey, parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import {
    CHUNK_SIDE,
    parseChunkKey,
} from '@/lib/utils/battle/map-storage/chunk-key';
import { toBase64 } from '@/lib/utils/common/base64';

export const CHUNK_SIZE = CHUNK_SIDE;

const CHUNK_BYTES = (CHUNK_SIZE * CHUNK_SIZE * 2 * 2) / 8;

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

function slot(x: number, y: number, side: 'e' | 's'): number {
    return (
        ((y % CHUNK_SIZE) * CHUNK_SIZE + (x % CHUNK_SIZE)) * 2 +
        (side === 'e' ? 0 : 1)
    );
}

function fromBase64(value: string, key: string): Uint8Array {
    let bin: string;

    try {
        bin = atob(value);
    } catch {
        throw new EdgeChunkError(`chunk ${key}: invalid base64`);
    }

    if (bin.length !== CHUNK_BYTES) {
        throw new EdgeChunkError(
            `chunk ${key}: expected ${CHUNK_BYTES} bytes, got ${bin.length}`
        );
    }

    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function put(
    chunks: Map<string, Uint8Array>,
    edge: string,
    kind: number,
    cols: number,
    rows: number
) {
    const { a, side } = parseEdgeKey(edge);

    if (!Number.isInteger(a.x) || !Number.isInteger(a.y)) {
        throw new EdgeChunkError(`invalid edge key ${edge}`);
    }

    if (a.x < 0 || a.y < 0 || a.x >= cols || a.y >= rows) return;

    const key = `${Math.floor(a.x / CHUNK_SIZE)}:${Math.floor(a.y / CHUNK_SIZE)}`;

    let bytes = chunks.get(key);

    if (!bytes) {
        bytes = new Uint8Array(CHUNK_BYTES);
        chunks.set(key, bytes);
    }

    const idx = slot(a.x, a.y, side);

    bytes[idx >> 2] |= kind << ((idx & 3) * 2);
}

export function encodeEdges(
    edges: Partial<EdgeSets>,
    cols: number,
    rows: number
): EdgeChunks {
    const chunks = new Map<string, Uint8Array>();

    for (const e of edges.bars ?? []) put(chunks, e, KIND_BAR, cols, rows);

    for (const e of edges.walls ?? []) {
        const { a, side } = parseEdgeKey(e);

        const key = `${Math.floor(a.x / CHUNK_SIZE)}:${Math.floor(a.y / CHUNK_SIZE)}`;

        const bytes = chunks.get(key);

        if (bytes) {
            const idx = slot(a.x, a.y, side);

            bytes[idx >> 2] &= ~(3 << ((idx & 3) * 2));
        }

        put(chunks, e, KIND_WALL, cols, rows);
    }

    const out: EdgeChunks = {};

    const keys = [...chunks.keys()].sort((p, q) => {
        const [px, py] = p.split(':').map(Number);

        const [qx, qy] = q.split(':').map(Number);

        return py - qy || px - qx;
    });

    for (const key of keys) {
        const bytes = chunks.get(key);

        if (bytes && bytes.some((b) => b !== 0)) out[key] = toBase64(bytes);
    }

    return out;
}

export function decodeEdges(
    chunks: EdgeChunks,
    cols: number,
    rows: number
): EdgeSets {
    const walls: { x: number; y: number; side: 'e' | 's' }[] = [];

    const bars: { x: number; y: number; side: 'e' | 's' }[] = [];

    for (const [key, value] of Object.entries(chunks)) {
        const parsed = parseChunkKey(key);

        if (!parsed) throw new EdgeChunkError(`invalid chunk key ${key}`);

        const { cx, cy } = parsed;

        const bytes = fromBase64(value, key);

        for (let idx = 0; idx < CHUNK_SIZE * CHUNK_SIZE * 2; idx++) {
            const kind = (bytes[idx >> 2] >> ((idx & 3) * 2)) & 3;

            if (kind === 0) continue;

            if (kind === 3)
                throw new EdgeChunkError(`chunk ${key}: reserved edge kind`);

            const cell = idx >> 1;

            const x = cx * CHUNK_SIZE + (cell % CHUNK_SIZE);

            const y = cy * CHUNK_SIZE + Math.floor(cell / CHUNK_SIZE);

            if (x >= cols || y >= rows) {
                throw new EdgeChunkError(
                    `chunk ${key}: edge outside ${cols}x${rows} grid`
                );
            }

            (kind === KIND_WALL ? walls : bars).push({
                x,
                y,
                side: idx & 1 ? 's' : 'e',
            });
        }
    }

    const order = (p: { x: number; y: number; side: string }, q: typeof p) =>
        p.y - q.y || p.x - q.x || p.side.localeCompare(q.side);

    const str = (e: { x: number; y: number; side: 'e' | 's' }) =>
        formatEdgeKey(e, e.side);

    return {
        walls: walls.sort(order).map(str),
        bars: bars.sort(order).map(str),
    };
}
