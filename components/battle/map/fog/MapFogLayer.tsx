'use client';

import { useContext, useMemo } from 'react';

import { FogWindowContext } from './fog-window-context';
import { FogSurface } from './FogSurface';

import { revealedHas } from '@/lib/utils/battle/fog/revealed-runs';
import { cellKey, gridOf } from '@/lib/utils/battle/grid/geometry';
import type { BattleMapConfig, RevealedRun } from '@/types/battle-grid';

const NO_CELLS: ReadonlySet<string> = new Set();

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
    const viewport = useContext(FogWindowContext);

    const dmReveal = dmEditing && mode === 'reveal';

    const shown = useMemo(() => {
        if (dmEditing && !dmReveal) return null;

        if (!dmReveal) return visible;

        const cells = new Set<string>();

        for (let y = 0; y < map.rows; y++)
            for (let x = 0; x < map.cols; x++)
                if (revealedHas(revealed, x, y)) cells.add(cellKey({ x, y }));

        return cells;
    }, [dmEditing, dmReveal, visible, revealed, map.cols, map.rows]);

    if (mode === 'off') return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            data-map-fog-layer
        >
            <FogSurface
                grid={{
                    cols: map.cols,
                    rows: map.rows,
                    cellPx,
                    kind: gridOf(map),
                    window: viewport,
                }}
                visible={shown}
                explored={dmEditing ? NO_CELLS : explored}
            />
        </div>
    );
}
