'use client';

import { useCallback, useState } from 'react';

import { FOG_MAX_VISION_RADIUS } from '@/lib/utils/battle/fog/constants';
import { floodRoom, revealCells, revealRectangle } from '@/lib/utils/battle/fog/reveal';
import type { MapFogData } from '@/types/api';
import type { BattleMapConfig, FogMode, GridPoint, RevealedRun } from '@/types/battle';

export type FogBrush = 'brush' | 'erase' | 'rectangle' | 'room';

export interface MapFogTool {
    active: boolean;
    brush: FogBrush;
    mode: FogMode;
    radius: number;
    toggle(): void;
    close(): void;
    setBrush(value: FogBrush): void;
    setMode(value: FogMode): void;
    setRadius(value: number): void;
    commitRadius(): void;
    applyCells(cells: readonly GridPoint[]): void;
    applyShape(from: GridPoint, to: GridPoint): void;
    onCell(cell: GridPoint): void;
}

export function useMapFogTool({
    isDM,
    map,
    mode,
    radius,
    mutate,
}: {
    isDM: boolean;
    map: BattleMapConfig | null;
    mode: FogMode;
    radius: number;
    mutate: (body: MapFogData) => Promise<unknown>;
}): MapFogTool | null {
    const [active, setActive] = useState(false);

    const [brush, setBrush] = useState<FogBrush>('brush');

    const [shapeStart, setShapeStart] = useState<GridPoint | null>(null);

    const [radiusDraft, setRadiusDraft] = useState<number | null>(null);

    const close = useCallback(() => {
        setActive(false);
        setShapeStart(null);
    }, []);

    const toggle = useCallback(() => {
        setActive((value) => !value);
        setShapeStart(null);
    }, []);

    const setMode = useCallback((value: FogMode) => void mutate({ mode: value }), [mutate]);

    const setRadius = useCallback((value: number) => setRadiusDraft(value), []);

    const commitRadius = useCallback(
        () => {
            const value = radiusDraft ?? radius;

            setRadiusDraft(null);
            void mutate({
                visionRadius: Math.max(
                    1,
                    Math.min(FOG_MAX_VISION_RADIUS, Math.round(value))
                ),
            });
        },
        [mutate, radiusDraft, radius]
    );

    const sendRuns = useCallback(
        (runs: RevealedRun[]) => {
            if (!runs.length) return;

            const tuples = runs.map(([y, start, end]) => [y, start, end] as [number, number, number]);

            void mutate(brush === 'erase' ? { remove: tuples } : { add: tuples });
        },
        [brush, mutate]
    );

    const applyCells = useCallback(
        (cells: readonly GridPoint[]) => {
            if (!map || brush === 'rectangle' || brush === 'room') return;

            sendRuns(revealCells(map, cells));
        },
        [map, brush, sendRuns]
    );

    const applyShape = useCallback(
        (from: GridPoint, to: GridPoint) => {
            if (!map) return;

            if (brush === 'room')
                sendRuns(revealCells(map, [...floodRoom({ map, start: from })].map((key) => {
                    const [x, y] = key.split(':').map(Number);

                    return { x, y };
                })));
            else if (brush === 'rectangle') sendRuns(revealRectangle(map, from, to));
            else applyCells([to]);
        },
        [map, brush, sendRuns, applyCells]
    );

    const onCell = useCallback(
        (cell: GridPoint) => {
            if (brush === 'room') {
                applyShape(cell, cell);

                return;
            }

            if (brush !== 'rectangle') {
                applyCells([cell]);

                return;
            }

            if (!shapeStart) setShapeStart(cell);
            else {
                applyShape(shapeStart, cell);
                setShapeStart(null);
            }
        },
        [brush, shapeStart, applyShape, applyCells]
    );

    if (!isDM || !map || map.maze) return null;

    return {
        active,
        brush,
        mode,
        radius: radiusDraft ?? radius,
        toggle,
        close,
        setBrush,
        setMode,
        setRadius,
        commitRadius,
        applyCells,
        applyShape,
        onCell,
    };
}
