import {
    type ArtCtx,
    makePatterns,
    type PaintEnv,
    type PaintInput,
    type PixelRect,
} from './assets';
import { paintFloors } from './paint-floors';
import { paintLight } from './paint-light';
import { paintOpenings } from './paint-openings';
import { paintStamps } from './paint-stamps';
import { paintWalls } from './paint-walls';

import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { gridMetrics, UNIT } from '@/lib/utils/battle/grid/layout';
import { bakePixelSize } from '@/lib/utils/battle/map-art/bake-size';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import { CHUNK_SIDE } from '@/lib/utils/battle/map-storage/chunk-key';
import { clamp } from '@/lib/utils/common/clamp';

export type { ArtAssets, ArtCtx, PaintInput, PixelRect } from './assets';
export { artTextureUrls, loadArtAssets } from './assets';

export function chunkPixelRect(
    cx: number,
    cy: number,
    map: MapDims,
    cellPx: number,
    marginCells = 1
): PixelRect {
    const metrics = gridMetrics(gridOf(map));

    const k = cellPx / UNIT;

    const total = bakePixelSize(map, cellPx);

    const margin = marginCells * cellPx;

    const x0 = clamp(cx * CHUNK_SIDE * metrics.colStep * k - margin, 0, total.width);

    const y0 = clamp(cy * CHUNK_SIDE * metrics.rowStep * k - margin, 0, total.height);

    const x1 = clamp(((cx + 1) * CHUNK_SIDE * metrics.colStep) * k + margin, 0, total.width);

    const y1 = clamp(((cy + 1) * CHUNK_SIDE * metrics.rowStep) * k + margin, 0, total.height);

    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function clipTo(ctx: ArtCtx, r: PixelRect): void {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.width, r.y);
    ctx.lineTo(r.x + r.width, r.y + r.height);
    ctx.lineTo(r.x, r.y + r.height);
    ctx.closePath();
    ctx.clip();
}

export function paintScene(ctx: ArtCtx, input: PaintInput): void {
    const { scene, map, cellPx, seed, assets, clip, createLayer } = input;

    const grid = gridOf(map);

    const env: PaintEnv = {
        ctx,
        scene,
        map,
        grid,
        cellPx,
        k: cellPx / UNIT,
        seed,
        assets,
        clip: clip ?? null,
        patterns: makePatterns(ctx, assets, cellPx),
        createLayer,
    };

    const area = clip ?? { x: 0, y: 0, ...bakePixelSize(map, cellPx) };

    ctx.save();

    if (clip) clipTo(ctx, clip);

    paintFloors(env);
    paintStamps(env, 'decal');
    paintWalls(env);
    paintOpenings(env);
    paintStamps(env, 'object');
    paintStamps(env, 'canopy');
    paintLight(env, area);
    ctx.restore();
}
