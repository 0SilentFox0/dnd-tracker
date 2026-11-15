import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export interface TileDefinitionProperties {
    blocks?: boolean;
    blocksSight?: boolean;
    footprint?: { cols: number; rows: number };
}

export type TileCatalogProperties = Readonly<
    Record<number, TileDefinitionProperties | undefined>
>;

export type TileLayerChunks = Partial<
    Record<TileLayer, Readonly<Record<string, Uint16Array>>>
>;

export interface DerivedTileCells {
    blocked: ReadonlySet<string>;
    blocksSight: ReadonlySet<string>;
}

export class UnknownTileIdError extends Error {
    constructor(
        readonly tileId: number,
        readonly layer: TileLayer
    ) {
        super(`Unknown tile id ${tileId} in layer ${layer}`);
        this.name = 'UnknownTileIdError';
    }
}

const CHUNK_SIDE = 16;

const CHUNK_CELLS = CHUNK_SIDE * CHUNK_SIDE;

const cache = new WeakMap<object, WeakMap<object, Map<string, DerivedTileCells>>>();

function parseChunkKey(key: string): { cx: number; cy: number } {
    const match = /^(\d+):(\d+)$/.exec(key);

    if (!match) throw new Error(`Invalid chunk key ${key}`);

    return { cx: Number(match[1]), cy: Number(match[2]) };
}

function addFootprint(
    output: Set<string>,
    x: number,
    y: number,
    footprint: { cols: number; rows: number },
    mapSize: { cols: number; rows: number }
): void {
    if (
        !Number.isInteger(footprint.cols) ||
        !Number.isInteger(footprint.rows) ||
        footprint.cols < 1 ||
        footprint.rows < 1 ||
        footprint.cols > 2 ||
        footprint.rows > 2
    )
        throw new Error('Tile footprint must be between 1x1 and 2x2');

    for (let fy = 0; fy < footprint.rows; fy++) {
        for (let fx = 0; fx < footprint.cols; fx++) {
            const cellX = x + fx;

            const cellY = y + fy;

            if (cellX < mapSize.cols && cellY < mapSize.rows)
                output.add(`${cellX}:${cellY}`);
        }
    }
}

export function deriveTileCells(
    input: {
        chunks: TileLayerChunks;
        cols: number;
        rows: number;
        version: number;
    },
    catalog: TileCatalogProperties
): DerivedTileCells {
    const cacheKey = `${input.version}:${input.cols}:${input.rows}`;

    const byCatalog = cache.get(input.chunks as object);

    const entries = byCatalog?.get(catalog as object);

    const cached = entries?.get(cacheKey);

    if (cached) return cached;

    const blocked = new Set<string>();

    const blocksSight = new Set<string>();

    for (const layer of ['ground', 'wallfill', 'objects', 'edge-art'] as const) {
        const chunks = input.chunks[layer];

        if (!chunks) continue;

        for (const [key, cells] of Object.entries(chunks)) {
            if (!(cells instanceof Uint16Array) || cells.length !== CHUNK_CELLS)
                throw new Error('Tile chunks must contain 256 Uint16 values');

            const { cx, cy } = parseChunkKey(key);

            for (let index = 0; index < cells.length; index++) {
                const tileId = cells[index];

                if (tileId === 0) continue;

                const tile = catalog[tileId];

                if (!tile) throw new UnknownTileIdError(tileId, layer);

                if (layer !== 'ground' && layer !== 'objects') continue;

                const x = cx * CHUNK_SIDE + (index % CHUNK_SIDE);

                const y = cy * CHUNK_SIDE + Math.floor(index / CHUNK_SIDE);

                if (x >= input.cols || y >= input.rows) continue;

                const footprint = tile.footprint ?? { cols: 1, rows: 1 };

                if (tile.blocks)
                    addFootprint(blocked, x, y, footprint, input);

                if (tile.blocksSight)
                    addFootprint(blocksSight, x, y, footprint, input);
            }
        }
    }

    const result = { blocked, blocksSight };

    const catalogCache =
        byCatalog?.get(catalog as object) ?? new Map<string, DerivedTileCells>();

    catalogCache.set(cacheKey, result);

    if (byCatalog) byCatalog.set(catalog as object, catalogCache);
    else cache.set(input.chunks as object, new WeakMap([[catalog as object, catalogCache]]));

    return result;
}
