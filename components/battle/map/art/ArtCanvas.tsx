'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';

import type { ArtPreviewState } from '../battle-map-types';

import { gridOf, mapPixelSize, mapSize, UNIT } from '@/lib/utils/battle/grid';
import { bakePixelSize } from '@/lib/utils/battle/map-art/bake-size';
import { dirtyChunks } from '@/lib/utils/battle/map-art/dirty';
import { parseChunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import {
    type ArtAssets,
    artTextureUrls,
    chunkPixelRect,
    loadArtAssets,
    paintScene,
} from '@/lib/utils/canvas/map-art/paint-scene';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

const MAX_SIDE_PX = 4096;

interface Props {
    map: BattleMapConfig;
    art: ArtPreviewState;
    cellPx: number;
}

export const ArtCanvas = memo(function ArtCanvas({ map, art, cellPx }: Props) {
    const { scene, mapId, revision } = art;

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const painted = useRef<{ scene: MapArtScene; px: number; assets: ArtAssets } | null>(
        null
    );

    const [assets, setAssets] = useState<ArtAssets | null>(null);

    const grid = gridOf(map);

    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;

    const side = Math.max(mapSize(map, grid).width, mapSize(map, grid).height) / UNIT;

    const px = Math.max(1, Math.min(cellPx * dpr, Math.floor(MAX_SIDE_PX / side)));

    const css = mapPixelSize(map, cellPx, grid);

    const textureKey = useMemo(
        () => [...new Set(artTextureUrls(scene))].sort().join('\n'),
        [scene]
    );

    useEffect(() => {
        let alive = true;

        void loadArtAssets(textureKey ? textureKey.split('\n') : []).then((a) => {
            if (alive) setAssets(a);
        });

        return () => {
            alive = false;
        };
    }, [textureKey]);

    useEffect(() => {
        const canvas = canvasRef.current;

        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx || !assets) return;

        const frame = requestAnimationFrame(() => {
            const prev = painted.current;

            const size = bakePixelSize(map, px);

            const base = { scene, map, cellPx: px, seed: mapId, assets };

            const dirty =
                prev && prev.px === px && prev.assets === assets
                    ? dirtyChunks(prev.scene, scene, grid)
                    : 'all';

            if (canvas.width !== size.width || canvas.height !== size.height) {
                canvas.width = size.width;
                canvas.height = size.height;
            }

            if (dirty === 'all') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                paintScene(ctx, base);
            } else {
                for (const key of dirty) {
                    const c = parseChunkKey(key);

                    if (!c) continue;

                    const clip = chunkPixelRect(c.cx, c.cy, map, px, 1);

                    if (clip.width <= 0 || clip.height <= 0) continue;

                    ctx.save();
                    ctx.clearRect(clip.x, clip.y, clip.width, clip.height);
                    paintScene(ctx, { ...base, clip });
                    ctx.restore();
                }
            }

            painted.current = { scene, px, assets };
        });

        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, revision, px, assets, mapId, map.cols, map.rows, map.gridType]);

    return (
        <canvas
            ref={canvasRef}
            data-art-canvas
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: css.width, height: css.height }}
        />
    );
});
