import { CHUNK_CELLS, parseChunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { encodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export interface TileChunkPatch {
    layer: TileLayer;
    cx: number;
    cy: number;
    data: string | null;
}

function assertChunk(cells: Uint16Array): void {
    if (!(cells instanceof Uint16Array) || cells.length !== CHUNK_CELLS)
        throw new Error(`Tile chunks must contain ${CHUNK_CELLS} cells`);
}

function isEmpty(cells: Uint16Array): boolean {
    return cells.every((value) => value === 0);
}

function same(a: Uint16Array, b: Uint16Array): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}

function coordinates(key: string): { cx: number; cy: number } {
    const parsed = parseChunkKey(key);

    if (!parsed) throw new Error(`Invalid tile chunk key ${key}`);

    return parsed;
}

export function diffTileChunks(
    layer: TileLayer,
    before: Readonly<Record<string, Uint16Array>>,
    after: Readonly<Record<string, Uint16Array>>
): TileChunkPatch[] {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

    const patches: TileChunkPatch[] = [];

    for (const key of keys) {
        const oldChunk = before[key];

        const newChunk = after[key];

        if (oldChunk) assertChunk(oldChunk);

        if (newChunk) assertChunk(newChunk);

        const oldValue = oldChunk && !isEmpty(oldChunk) ? oldChunk : null;

        const newValue = newChunk && !isEmpty(newChunk) ? newChunk : null;

        if (
            (!oldValue && !newValue) ||
            (oldValue && newValue && same(oldValue, newValue))
        )
            continue;

        const { cx, cy } = coordinates(key);

        patches.push({
            layer,
            cx,
            cy,
            data: newValue ? encodeTileChunk(newValue) : null,
        });
    }

    return patches.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
}
