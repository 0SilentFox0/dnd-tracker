'use client';

import { useEffect, useRef } from 'react';

import { revealedHas } from '@/lib/utils/battle/fog/revealed-runs';
import { cellKey } from '@/lib/utils/battle/grid/geometry';
import type { BattleMapConfig, RevealedRun } from '@/types/battle';

export function MapFogLayer({
    map,
    cellPx,
    mode,
    revealed,
    visible,
    explored,
    dmEditing,
}: {
    map: BattleMapConfig;
    cellPx: number;
    mode: 'off' | 'reveal' | 'vision';
    revealed: readonly RevealedRun[];
    visible: ReadonlySet<string>;
    explored: ReadonlySet<string>;
    dmEditing: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        const context = canvas?.getContext('2d');

        if (!canvas || !context || mode === 'off') return;

        const dpr = Math.max(1, window.devicePixelRatio || 1);

        const width = map.cols * cellPx;

        const height = map.rows * cellPx;

        canvas.width = Math.ceil(width * dpr);
        canvas.height = Math.ceil(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);

        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                const key = cellKey({ x, y });

                const isVisible = dmEditing
                    ? mode === 'reveal'
                        ? revealedHas(revealed, x, y)
                        : true
                    : visible.has(key);

                if (isVisible) continue;

                context.fillStyle = explored.has(key)
                    ? 'rgba(0, 0, 0, 0.48)'
                    : 'rgba(0, 0, 0, 0.88)';
                context.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
            }
        }
    }, [map, cellPx, mode, revealed, visible, explored, dmEditing]);

    if (mode === 'off') return null;

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            data-map-fog-layer
        />
    );
}
