'use client';

import { memo, type CSSProperties } from 'react';

import { tileDefinition } from '@/lib/constants/tilesets/catalog';
import type { MapSpellEffect } from '@/lib/constants/tilesets/types';
import { UNIT, type GridWindow } from '@/lib/utils/battle/grid';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { BattleMapConfig } from '@/types/battle';

const SIDE = 16;

export const MapEffectsLayer = memo(function MapEffectsLayer({
    chunks,
    window,
    map,
    cellPx,
}: {
    chunks: TileLayerChunks;
    window: GridWindow | null;
    map: Pick<BattleMapConfig, 'cols' | 'rows'>;
    cellPx: number;
}) {
    if (!window) return null;

    const effects: {
        id: number;
        kind: MapSpellEffect;
        x: number;
        y: number;
    }[] = [];
    const layer = chunks.effects;
    const minX = Math.max(0, window.x);
    const minY = Math.max(0, window.y);
    const maxX = Math.min(map.cols, window.x + window.cols);
    const maxY = Math.min(map.rows, window.y + window.rows);

    if (layer) {
        for (const [key, cells] of Object.entries(layer)) {
            const [cx, cy] = key.split(':').map(Number);
            const x0 = Math.max(minX, cx * SIDE);
            const y0 = Math.max(minY, cy * SIDE);
            const x1 = Math.min(maxX, (cx + 1) * SIDE);
            const y1 = Math.min(maxY, (cy + 1) * SIDE);

            for (let y = y0; y < y1; y++)
                for (let x = x0; x < x1; x++) {
                    const id = cells[(y % SIDE) * SIDE + (x % SIDE)];
                    const kind = tileDefinition(id)?.effectKind;
                    if (kind) effects.push({ id, kind, x, y });
                }
        }
    }

    if (!effects.length) return null;

    return (
        <div
            aria-hidden="true"
            className="map-hud-anim pointer-events-none absolute inset-0 z-20"
            data-map-effects=""
        >
            {effects.map(({ id, kind, x, y }) => (
                <span
                    key={`${x}:${y}:${id}`}
                    className="map-spell-effect-cell"
                    style={{
                        left: x * cellPx,
                        top: y * cellPx,
                        width: cellPx,
                        height: cellPx,
                    }}
                >
                    <i
                        className="map-hud-fx"
                        data-hud-fx={kind}
                        style={
                            {
                                '--map-fx-delay': `${((x * 7 + y * 11) % 9) * -0.17}s`,
                            } as CSSProperties
                        }
                    />
                </span>
            ))}
        </div>
    );
});
