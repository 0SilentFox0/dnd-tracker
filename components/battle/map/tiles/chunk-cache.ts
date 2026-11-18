import { drawTileViewport, type TileRasterAssets } from './painter';

import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { GridWindow } from '@/lib/utils/battle/grid';
import { CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';

export interface TileRasterChunkKey {
    mapId: string;
    version: number;
    layer: TileLayer;
    cx: number;
    cy: number;
    pixelRatio: number;
    signature: string;
}

interface CacheEntry<T> {
    version: number;
    signature: string;
    raster: T;
    bytes: number;
}

export class TileRasterChunkCache<T = CanvasImageSource> {
    private readonly entries = new Map<string, CacheEntry<T>>();
    private byteCount = 0;

    constructor(private readonly maxBytes = 64 * 1024 * 1024) {}

    getOrCreate(key: TileRasterChunkKey, render: () => T): T {
        const cacheKey = [
            key.mapId,
            key.layer,
            key.cx,
            key.cy,
            key.pixelRatio,
        ].join(':');

        const cached = this.entries.get(cacheKey);

        if (cached?.signature === key.signature) {
            cached.version = key.version;
            this.entries.delete(cacheKey);
            this.entries.set(cacheKey, cached);

            return cached.raster;
        }

        if (cached) this.remove(cacheKey, cached);

        const raster = render();

        const image = raster as T & { width?: number; height?: number };

        const bytes = (image.width ?? 0) * (image.height ?? 0) * 4;

        if (bytes > this.maxBytes) return raster;

        this.entries.set(cacheKey, {
            version: key.version,
            signature: key.signature,
            raster,
            bytes,
        });
        this.byteCount += bytes;

        while (this.byteCount > this.maxBytes && this.entries.size > 1) {
            const oldestKey = this.entries.keys().next().value as
                | string
                | undefined;

            if (!oldestKey) break;

            const oldest = this.entries.get(oldestKey);

            if (oldest) this.remove(oldestKey, oldest);
        }

        return raster;
    }

    clear(): void {
        for (const entry of this.entries.values()) this.close(entry.raster);
        this.entries.clear();
        this.byteCount = 0;
    }

    private remove(key: string, entry: CacheEntry<T>): void {
        this.entries.delete(key);
        this.byteCount -= entry.bytes;
        this.close(entry.raster);
    }

    private close(raster: T): void {
        const closable = raster as T & { close?: () => void };

        closable.close?.();
    }
}

const CHUNK_PADDING = 1;

const TILE_LAYERS: readonly TileLayer[] = [
    'ground',
    'wallfill',
    'edge-art',
    'objects',
];

const rasterCache = new TileRasterChunkCache<CanvasImageSource>();

export function clearTileRasterCache(): void {
    rasterCache.clear();
}

const SIGNATURE_MEMO_LIMIT = 512;

const signatureMemo = new WeakMap<
    TileLayerChunks,
    WeakMap<TileRasterAssets, Map<string, string>>
>();

function memoizedSignature(
    chunks: TileLayerChunks,
    layer: TileLayer,
    cx: number,
    cy: number,
    assets: TileRasterAssets,
    cellPx: number,
    seed: string
): string {
    let byAssets = signatureMemo.get(chunks);

    if (!byAssets) signatureMemo.set(chunks, (byAssets = new WeakMap()));

    let byKey = byAssets.get(assets);

    if (!byKey) byAssets.set(assets, (byKey = new Map()));

    const key = `${layer}|${cx}|${cy}|${cellPx}|${seed}`;

    let signature = byKey.get(key);

    if (signature === undefined) {
        if (byKey.size >= SIGNATURE_MEMO_LIMIT) byKey.clear();

        signature = rasterSignature(
            chunks,
            layer,
            cx,
            cy,
            assets,
            cellPx,
            seed
        );
        byKey.set(key, signature);
    }

    return signature;
}

function createRasterCanvas(width: number, height: number) {
    if (typeof OffscreenCanvas !== 'undefined')
        return new OffscreenCanvas(width, height);

    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return canvas;
}

function hasNearbyChunk(
    chunks: TileLayerChunks,
    layer: TileLayer,
    cx: number,
    cy: number
): boolean {
    for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
            if (chunks[layer]?.[chunkKey(x, y)]) return true;
        }
    }

    return false;
}

export function rasterSignature(
    chunks: TileLayerChunks,
    layer: TileLayer,
    cx: number,
    cy: number,
    assets: TileRasterAssets,
    cellPx: number,
    seed: string
): string {
    const used = new Set<number>();

    const parts: string[] = [];

    for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) {
            const values = chunks[layer]?.[chunkKey(x, y)];

            if (values) for (const id of values) if (assets[id]) used.add(id);

            parts.push(`${x}:${y}:${values ? values.join(',') : ''}`);
        }
    }

    const loaded = [...used].sort((a, b) => a - b).join(',');

    return `assets:${loaded}|cell:${cellPx}|seed:${seed}|${parts.join('|')}`;
}

export function drawCachedTileViewport(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    input: {
        mapId: string;
        version?: number;
        chunks: TileLayerChunks;
        assets: TileRasterAssets;
        catalog: Readonly<Record<number, TileDefinition | undefined>>;
        window: GridWindow;
        cellPx: number;
        pixelRatio: number;
        seed: string;
    }
): void {
    const {
        mapId,
        version = 0,
        chunks,
        assets,
        catalog,
        window,
        cellPx,
        pixelRatio,
        seed,
    } = input;

    ctx.clearRect(0, 0, window.cols * cellPx, window.rows * cellPx);

    const startCx = Math.max(
        0,
        Math.floor((window.x - CHUNK_PADDING) / CHUNK_SIDE)
    );

    const startCy = Math.max(
        0,
        Math.floor((window.y - CHUNK_PADDING) / CHUNK_SIDE)
    );

    const endCx = Math.floor(
        (window.x + window.cols + CHUNK_PADDING - 1) / CHUNK_SIDE
    );

    const endCy = Math.floor(
        (window.y + window.rows + CHUNK_PADDING - 1) / CHUNK_SIDE
    );

    const rasterCells = CHUNK_SIDE + CHUNK_PADDING * 2;

    const rasterSize = Math.ceil(rasterCells * cellPx * pixelRatio);

    for (const layer of TILE_LAYERS) {
        for (let cy = startCy; cy <= endCy; cy++) {
            for (let cx = startCx; cx <= endCx; cx++) {
                if (!hasNearbyChunk(chunks, layer, cx, cy)) continue;

                const raster = rasterCache.getOrCreate(
                    {
                        mapId,
                        version,
                        layer,
                        cx,
                        cy,
                        pixelRatio,
                        signature: memoizedSignature(
                            chunks,
                            layer,
                            cx,
                            cy,
                            assets,
                            cellPx,
                            seed
                        ),
                    },
                    () => {
                        const buffer = createRasterCanvas(
                            rasterSize,
                            rasterSize
                        );

                        const bufferContext = buffer.getContext('2d') as
                            | CanvasRenderingContext2D
                            | OffscreenCanvasRenderingContext2D
                            | null;

                        if (!bufferContext) return buffer;

                        bufferContext.setTransform(
                            pixelRatio,
                            0,
                            0,
                            pixelRatio,
                            0,
                            0
                        );
                        drawTileViewport(bufferContext, {
                            chunks,
                            assets,
                            catalog,
                            window: {
                                x: cx * CHUNK_SIDE - CHUNK_PADDING,
                                y: cy * CHUNK_SIDE - CHUNK_PADDING,
                                cols: rasterCells,
                                rows: rasterCells,
                            },
                            cellPx,
                            seed,
                            layers: [layer],
                        });

                        return buffer;
                    }
                );

                const sourcePadding = CHUNK_PADDING * cellPx * pixelRatio;

                const sourceSide = CHUNK_SIDE * cellPx * pixelRatio;

                ctx.drawImage(
                    raster,
                    sourcePadding,
                    sourcePadding,
                    sourceSide,
                    sourceSide,
                    (cx * CHUNK_SIDE - window.x) * cellPx,
                    (cy * CHUNK_SIDE - window.y) * cellPx,
                    CHUNK_SIDE * cellPx,
                    CHUNK_SIDE * cellPx
                );
            }
        }
    }
}
