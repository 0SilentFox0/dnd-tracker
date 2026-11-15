import { type TileLayer,tileLayerFromId } from '@/lib/utils/battle/tiles/types';

export interface MapChunkRow {
    cx: number;
    cy: number;
    data: string;
    layer?: number | null;
}

export interface SplitMapChunkRows {
    edges: Record<string, string>;
    tiles: Partial<Record<TileLayer, Record<string, string>>>;
}

export class UnknownTileLayerError extends Error {
    constructor(readonly layerId: number) {
        super(`Unknown battle map chunk layer ${layerId}`);
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

        const layerId = row.layer ?? 0;

        const key = `${row.cx}:${row.cy}`;

        const unique = `${layerId}:${key}`;

        if (seen.has(unique)) throw new DuplicateMapChunkError(unique);

        seen.add(unique);

        if (layerId === 0) {
            edges[key] = row.data;
            continue;
        }

        const layer = tileLayerFromId(layerId);

        if (!layer) throw new UnknownTileLayerError(layerId);

        const byKey = (tiles[layer] ??= {});

        byKey[key] = row.data;
    }

    return { edges, tiles };
}
