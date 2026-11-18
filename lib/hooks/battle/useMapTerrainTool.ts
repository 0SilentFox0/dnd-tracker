'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    DEFAULT_BRUSH,
    enqueue,
    isEdgeBrush,
    type TerrainBrushSettings,
    terrainOfBrush,
} from './terrain-brush';
import { sendEdgeBatches } from './terrain-edge-batches';

export {
    type EdgeBrush,
    isEdgeBrush,
    MAX_BARRIER_ROUNDS,
    type StateBrush,
    type TerrainBrush,
} from './terrain-brush';

import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { cellKey, wallSet } from '@/lib/utils/battle/grid';
import type {
    MapEdgeRemoveData,
    MapTerrainData,
    MapTerrainResponse,
    MapWallsData,
} from '@/types/api';
import type { GridPoint } from '@/types/battle-grid';

export interface MapTerrainTool {
    active: boolean;
    toggle(): void;
    close(): void;
    brush: TerrainBrushSettings;
    setBrush(patch: Partial<TerrainBrushSettings>): void;
    commit(cells: GridPoint[]): void;
    pending: ReadonlySet<string>;
    edges: EdgeEditing | null;
}

export interface StateEdgeSource {
    present: ReadonlySet<string>;
    removed: ReadonlySet<string>;
    mutate: (data: MapEdgeRemoveData) => Promise<unknown>;
}

export interface EdgeSource {
    walls?: string[];
    bars?: string[];
    mutate: (data: MapWallsData) => Promise<unknown>;
}

interface Options {
    isDM: boolean;
    mutate: (data: MapTerrainData) => Promise<MapTerrainResponse | undefined>;
    onSkipped?: (count: number) => void;
    onActivate?: () => void;
    edgeSource?: EdgeSource;
    stateEdgeSource?: StateEdgeSource;
}

const EMPTY: ReadonlySet<string> = new Set();

export function useMapTerrainTool({
    isDM,
    mutate,
    onSkipped,
    onActivate,
    edgeSource,
    stateEdgeSource,
}: Options): MapTerrainTool {
    const [on, setOn] = useState(false);

    const [brush, setBrushState] = useState(DEFAULT_BRUSH);

    const setBrush = useCallback(
        (patch: Partial<TerrainBrushSettings>) =>
            setBrushState((b) => ({ ...b, ...patch })),
        []
    );

    const [pending, setPending] = useState<ReadonlySet<string>>(EMPTY);

    const active = on && isDM;

    const latest = useRef({
        brush,
        mutate,
        onSkipped,
        edgeSource,
        stateEdgeSource,
    });

    useEffect(() => {
        latest.current = {
            brush,
            mutate,
            onSkipped,
            edgeSource,
            stateEdgeSource,
        };
    });

    const queue = useRef<MapTerrainData[]>([]);

    const inFlight = useRef<MapTerrainData | null>(null);

    const syncPending = useCallback(() => {
        const all = [inFlight.current, ...queue.current].flatMap(
            (d) => d?.cells ?? []
        );

        setPending(all.length > 0 ? new Set(all) : EMPTY);
    }, []);

    // one request at a time: parallel strokes would read the same battle version and hit 409
    const drain = useCallback(async () => {
        if (inFlight.current) return;

        for (
            let next = queue.current.shift();
            next;
            next = queue.current.shift()
        ) {
            inFlight.current = next;
            syncPending();

            try {
                const res = await latest.current.mutate(next);

                if (res?.skipped?.length)
                    latest.current.onSkipped?.(res.skipped.length);
            } catch {
                // useBattleAction already showed the error
            }
        }

        inFlight.current = null;
        syncPending();
    }, [syncPending]);

    const close = useCallback(() => setOn(false), []);

    const toggle = useCallback(() => {
        setOn((v) => !v);
        onActivate?.();
    }, [onActivate]);

    const commit = useCallback(
        (points: GridPoint[]) => {
            const cells = [...new Set(points.map(cellKey))];

            if (cells.length === 0) return;

            const {
                kind: b,
                rounds: r,
                label: l,
                dice: d,
                damageType: t,
            } = latest.current.brush;

            if (isEdgeBrush(b)) return;

            const terrain = terrainOfBrush(b, {
                rounds: r,
                label: l,
                dice: d,
                damageType: t,
            });

            enqueue(queue.current, {
                cells,
                terrain,
                ...(b === 'erase-zone' && { eraseZone: true as const }),
            });
            syncPending();
            void drain();
        },
        [drain, syncPending]
    );

    useEffect(() => {
        if (!active) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOn(false);
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [active]);

    const edgeChain = useRef<Promise<unknown>>(Promise.resolve());

    const [inFlightEdges, setInFlightEdges] = useState<
        Array<{ add: string[]; remove: string[] }>
    >([]);

    const committed = useMemo<EdgeEditing['committed']>(
        () => ({
            add: new Set(inFlightEdges.flatMap((d) => d.add)),
            remove: new Set(inFlightEdges.flatMap((d) => d.remove)),
        }),
        [inFlightEdges]
    );

    const send = useCallback(
        (
            shown: { add: string[]; remove: string[] },
            run: () => Promise<unknown>
        ) => {
            // a single battle version: parallel strokes would hit 409
            setInFlightEdges((list) => [...list, shown]);
            edgeChain.current = edgeChain.current
                .then(run)
                .catch(() => undefined)
                .finally(() =>
                    setInFlightEdges((list) => list.filter((d) => d !== shown))
                );
        },
        []
    );

    const commitEdges = useCallback(
        (add: string[], remove: string[]) =>
            sendEdgeBatches(latest.current, { add, remove }, send),
        [send]
    );

    const edges = useMemo<EdgeEditing | null>(() => {
        if (!active || !isEdgeBrush(brush.kind)) return null;

        if (brush.kind === 'edge-break' || brush.kind === 'edge-restore') {
            if (!stateEdgeSource) return null;

            const restore = brush.kind === 'edge-restore';

            return {
                existing: restore
                    ? stateEdgeSource.removed
                    : stateEdgeSource.present,
                erase: true,
                committed,
                onCommit: commitEdges,
                ...(restore && { ghost: stateEdgeSource.removed }),
            };
        }

        if (!edgeSource) return null;

        const walls = wallSet(edgeSource.walls);

        const bars = wallSet(edgeSource.bars);

        return {
            existing:
                brush.kind === 'edge-wall'
                    ? walls
                    : brush.kind === 'edge-bars'
                      ? bars
                      : new Set([...walls, ...bars]),
            ...(brush.kind === 'edge-erase' && { erase: true }),
            committed,
            onCommit: commitEdges,
        };
    }, [
        active,
        brush.kind,
        edgeSource,
        stateEdgeSource,
        commitEdges,
        committed,
    ]);

    return { active, toggle, close, brush, setBrush, commit, pending, edges };
}
