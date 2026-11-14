'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    DEFAULT_HAZARD_DAMAGE_TYPE,
    DEFAULT_HAZARD_DICE,
    MAP_EDGES_PER_OP,
} from '@/lib/constants/battle';
import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import {
    cellKey,
    type EdgeTool,
    hazardDamage,
    wallSet,
} from '@/lib/utils/battle/grid';
import type {
    MapEdgeRemoveData,
    MapTerrainData,
    MapTerrainResponse,
    MapWallsData,
} from '@/types/api';
import type { GridPoint, TerrainKind } from '@/types/battle';

export type EdgeBrush = EdgeTool;

export type StateBrush = 'edge-break' | 'edge-restore';

export type TerrainBrush =
    | TerrainKind
    | 'erase'
    | 'erase-zone'
    | EdgeBrush
    | StateBrush;

export const isEdgeBrush = (
    kind: TerrainBrush
): kind is EdgeBrush | StateBrush => kind.startsWith('edge-');

const MAX_STROKE_CELLS = 400;

export const MAX_BARRIER_ROUNDS = 20;

interface TerrainBrushSettings {
    kind: TerrainBrush;
    rounds: number;
    label: string;
    /** порожньо — небезпека без шкоди */
    dice: string;
    damageType: string;
}

export interface MapTerrainTool {
    active: boolean;
    toggle(): void;
    close(): void;
    brush: TerrainBrushSettings;
    setBrush(patch: Partial<TerrainBrushSettings>): void;
    commit(cells: GridPoint[]): void;
    /** клітинки штрихів, що чекають на відповідь сервера */
    pending: ReadonlySet<string>;
    /** штрих по ребрах (стіни й ґрати); null, коли активний пензель клітинок */
    edges: EdgeEditing | null;
}

export interface StateEdgeSource {
    /** стіни й ґрати ефективної карти */
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

const DEFAULT_BRUSH: TerrainBrushSettings = {
    kind: 'wall',
    rounds: 1,
    label: '',
    dice: DEFAULT_HAZARD_DICE,
    damageType: DEFAULT_HAZARD_DAMAGE_TYPE,
};

const sameTerrain = (a: MapTerrainData, b: MapTerrainData) =>
    JSON.stringify([a.terrain, a.eraseZone]) ===
    JSON.stringify([b.terrain, b.eraseZone]);

function enqueue(queue: MapTerrainData[], next: MapTerrainData) {
    const last = queue.at(-1);

    if (last && sameTerrain(last, next)) {
        const merged = [...new Set([...last.cells, ...next.cells])];

        if (merged.length <= MAX_STROKE_CELLS) {
            last.cells = merged;

            return;
        }
    }

    for (let i = 0; i < next.cells.length; i += MAX_STROKE_CELLS)
        queue.push({
            ...next,
            cells: next.cells.slice(i, i + MAX_STROKE_CELLS),
        });
}

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

    // один запит за раз: паралельні штрихи читали б ту саму версію бою й ловили 409
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
                // помилку вже показав useBattleAction
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

            const damage = hazardDamage(d, t);

            const terrain: MapTerrainData['terrain'] =
                b === 'erase' || b === 'erase-zone'
                    ? null
                    : b === 'barrier'
                      ? {
                            kind: b,
                            rounds: Math.min(
                                MAX_BARRIER_ROUNDS,
                                Math.max(1, Math.trunc(r) || 1)
                            ),
                        }
                      : b === 'hazard'
                        ? {
                              kind: b,
                              ...(l.trim() && { label: l.trim() }),
                              ...(damage && { damage }),
                          }
                        : { kind: b };

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

    const commitEdges = useCallback((add: string[], remove: string[]) => {
        const {
            brush: b,
            edgeSource: src,
            stateEdgeSource: state,
        } = latest.current;

        const send = (
            shown: { add: string[]; remove: string[] },
            run: () => Promise<unknown>
        ) => {
            // версія бою одна: паралельні штрихи ловили б 409
            setInFlightEdges((list) => [...list, shown]);
            edgeChain.current = edgeChain.current
                .then(run)
                .catch(() => undefined)
                .finally(() =>
                    setInFlightEdges((list) => list.filter((d) => d !== shown))
                );
        };

        if (b.kind === 'edge-break' || b.kind === 'edge-restore') {
            if (!state) return;

            for (let i = 0; i < remove.length; i += MAP_EDGES_PER_OP) {
                const edges = remove.slice(i, i + MAP_EDGES_PER_OP);

                send({ add: [], remove: edges }, () =>
                    state.mutate({
                        edges,
                        ...(b.kind === 'edge-restore' && { restore: true }),
                    })
                );
            }

            return;
        }

        if (!src) return;

        const batches = (
            kind: MapWallsData['kind'],
            a: string[],
            r: string[]
        ) => {
            const n = Math.max(a.length, r.length);

            for (let i = 0; i < n; i += MAP_EDGES_PER_OP) {
                const data: MapWallsData = {
                    kind,
                    add: a.slice(i, i + MAP_EDGES_PER_OP),
                    remove: r.slice(i, i + MAP_EDGES_PER_OP),
                };

                send(data, () => src.mutate(data));
            }
        };

        if (b.kind === 'edge-erase') {
            batches('both', [], remove);

            return;
        }

        batches(b.kind === 'edge-wall' ? 'walls' : 'bars', add, remove);
    }, []);

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
