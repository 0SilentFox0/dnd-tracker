'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { loadTileImage, visibleTileIds as getVisibleTileIds } from './assets';
import { clearTileRasterCache, drawCachedTileViewport } from './chunk-cache';
import type { TileRasterAssets } from './painter';

import { TILE_CATALOG, tileDefinition } from '@/lib/constants/tilesets/catalog';
import type { TileDefinition } from '@/lib/constants/tilesets/types';
import type { GridWindow } from '@/lib/utils/battle/grid';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';

const CATALOG_BY_ID = Object.fromEntries(
    TILE_CATALOG.map((definition) => [definition.id, definition])
);

export interface TileRenderState {
    mapId: string;
    version: number;
    seed: string;
    chunks: TileLayerChunks;
    assets: TileRasterAssets;
}

export function TileCanvas({
    tiles,
    viewport,
    cellPx,
}: {
    tiles: TileRenderState;
    viewport: GridWindow | null;
    cellPx: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [loadedAssets, setLoadedAssets] = useState<TileRasterAssets>({});

    const requested = useRef(new Set<number>());

    const visibleTileIds = useMemo(
        () => (viewport ? getVisibleTileIds(tiles.chunks, viewport) : []),
        [tiles.chunks, viewport]
    );

    useEffect(() => {
        const definitions = visibleTileIds
            .filter((id) => !requested.current.has(id))
            .map((id) => tileDefinition(id))
            .filter(
                (definition): definition is TileDefinition =>
                    definition !== undefined && definition.assetFile !== null
            );

        if (definitions.length === 0) return;

        for (const definition of definitions)
            requested.current.add(definition.id);

        void Promise.all(
            definitions.map(async (definition) => {
                try {
                    const image = await loadTileImage(definition);

                    return [definition.id, { image }] as const;
                } catch {
                    requested.current.delete(definition.id);

                    return null;
                }
            })
        ).then((entries) => {
            const next = {} as Record<number, TileRasterAssets[number]>;

            for (const entry of entries) {
                if (entry) next[entry[0]] = entry[1];
            }

            if (Object.keys(next).length === 0) return;

            setLoadedAssets((previous) => ({ ...previous, ...next }));
        });
    }, [visibleTileIds]);

    const assets = useMemo(
        () => ({ ...loadedAssets, ...tiles.assets }),
        [loadedAssets, tiles.assets]
    );

    useEffect(() => clearTileRasterCache, [tiles.mapId]);

    useEffect(() => {
        const canvas = canvasRef.current;

        const context = canvas?.getContext('2d');

        if (!canvas || !context || !viewport || cellPx <= 0) return;

        const pixelRatio = globalThis.devicePixelRatio || 1;

        const width = Math.ceil(viewport.cols * cellPx);

        const height = Math.ceil(viewport.rows * cellPx);

        const pixelWidth = Math.ceil(width * pixelRatio);

        const pixelHeight = Math.ceil(height * pixelRatio);

        if (canvas.width !== pixelWidth) canvas.width = pixelWidth;

        if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawCachedTileViewport(context, {
            mapId: tiles.mapId,
            version: tiles.version,
            chunks: tiles.chunks,
            assets,
            catalog: CATALOG_BY_ID,
            window: viewport,
            cellPx,
            pixelRatio,
            seed: tiles.seed,
        });
    }, [tiles, assets, viewport, cellPx]);

    if (!viewport) return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            data-tile-canvas=""
            className="pointer-events-none absolute z-0"
            style={{
                left: viewport.x * cellPx,
                top: viewport.y * cellPx,
                width: viewport.cols * cellPx,
                height: viewport.rows * cellPx,
            }}
        />
    );
}
