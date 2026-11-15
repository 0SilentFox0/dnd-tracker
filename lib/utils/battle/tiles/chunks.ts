import { isTileLayer, type TileLayer } from '@/lib/utils/battle/tiles/types';

export interface MapChunkRow {
    cx: number;
    cy: number;
    data: string;
    tileLayers?: unknown;
}

export interface SplitMapChunkRows {
    edges: Record<string, string>;
    tiles: Partial<Record<TileLayer, Record<string, string>>>;
}

export class UnknownTileLayerError extends Error {
    constructor(readonly layer: string) {
        super(`Unknown battle map tile layer ${layer}`);
        this.name = 'UnknownTileLayerError';
    }
}

export class DuplicateMapChunkError extends Error {
    constructor(readonly key: string) {
        super(`Duplicate battle map chunk ${key}`);
        this.name = 'DuplicateMapChunkError';
    }
}

export function splitMapChunkRows(rows: readonly MapChunkRow[]): SplitMapChunkRows {
    const edges: Record<string, string> = {};

    const tiles: Partial<Record<TileLayer, Record<string, string>>> = {};

    const seen = new Set<string>();

    for (const row of rows) {
        if (
            !Number.isInteger(row.cx) ||
            !Number.isInteger(row.cy) ||
            row.cx < 0 ||
            row.cy < 0
        )
            throw new Error('Battle map chunk coordinates must be non-negative integers');

        const key = `${row.cx}:${row.cy}`;

        if (seen.has(key)) throw new DuplicateMapChunkError(key);

        seen.add(key);
        edges[key] = row.data;

        if (row.tileLayers == null) continue;

        if (typeof row.tileLayers !== 'object' || Array.isArray(row.tileLayers))
            throw new Error('Battle map tile layers must be an object');

        for (const [layerName, data] of Object.entries(row.tileLayers)) {
            if (!isTileLayer(layerName)) throw new UnknownTileLayerError(layerName);

            if (typeof data !== 'string')
                throw new Error(`Tile chunk ${layerName} must be a string`);

            (tiles[layerName] ??= {})[key] = data;
        }
    }

    return { edges, tiles };
}
