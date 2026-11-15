'use client';

import { useEffect, useRef } from 'react';

import { drawTileViewport, type TileRasterAssets } from './painter';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type { GridWindow } from '@/lib/utils/battle/grid';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';

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

    useEffect(() => {
        const canvas = canvasRef.current;

        const context = canvas?.getContext('2d');

        if (!canvas || !context || !viewport || cellPx <= 0) return;

        const pixelRatio = globalThis.devicePixelRatio || 1;

        const width = Math.ceil(viewport.cols * cellPx);

        const height = Math.ceil(viewport.rows * cellPx);

        canvas.width = Math.ceil(width * pixelRatio);
        canvas.height = Math.ceil(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawTileViewport(context, {
            chunks: tiles.chunks,
            assets: tiles.assets,
            catalog: Object.fromEntries(
                TILE_CATALOG.map((definition) => [definition.id, definition])
            ),
            window: viewport,
            cellPx,
            seed: tiles.seed,
        });
    }, [tiles, viewport, cellPx]);

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
