'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_ART } from '@/lib/constants/map-art/materials';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { cellKey, gridOf } from '@/lib/utils/battle/grid/geometry';
import { cellCenter, unitOf } from '@/lib/utils/battle/grid/layout';
import {
    applyFloorStroke,
    clipScene,
    decodeFloors,
    encodeFloors,
    type FloorChunks,
    type MapDims,
    roomPerimeter,
    sceneFromMap,
} from '@/lib/utils/battle/map-art';
import type { TileEditTool } from '@/lib/utils/battle/tiles/edit';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type {
    MapArtLight,
    MapArtRecord,
    MapArtScene,
    OpeningKind,
} from '@/types/battle-map';
import type { LogLine } from '@/types/text';

export type ArtTool =
    | 'floor'
    | 'floor-fill'
    | 'floor-erase'
    | 'wall'
    | 'wall-erase'
    | 'room'
    | 'opening'
    | 'blocked'
    | 'light';

type Point = { x: number; y: number };

type MapInput = MapDims &
    Pick<BattleMapConfig, 'walls' | 'bars' | 'doors' | 'blocked'>;

interface OpeningMaterial {
    kind: OpeningKind;
    material: string;
    locked: boolean;
}

interface Materials {
    floor: number;
    wall: string;
    blocked: string | null;
    opening: OpeningMaterial;
}

type MaterialsPatch = Partial<Omit<Materials, 'opening'>> & {
    opening?: Partial<OpeningMaterial>;
};

interface History {
    past: MapArtScene[];
    present: MapArtScene | null;
    future: MapArtScene[];
    saved: MapArtScene | null;
    revision: number;
}

const HISTORY_LIMIT = 50;

const MAX_LIGHTS = 64;

const FLOOR_TOOLS: Partial<Record<ArtTool, TileEditTool>> = {
    floor: 'brush',
    'floor-fill': 'fill',
    'floor-erase': 'eraser',
};

const notice = (key: string): LogLine => ({
    message: `maps.editor.art.notice.${key}`,
});

const withoutKeys = <T>(rec: Record<string, T>, keys: readonly string[]) => {
    const next = { ...rec };

    for (const k of keys) delete next[k];

    return next;
};

export function useMapArtEditor({
    initial,
    map,
}: {
    initial: MapArtScene | null;
    map: MapInput;
}) {
    const [history, setHistory] = useState<History>(() => ({
        past: [],
        present: initial,
        future: [],
        saved: initial,
        revision: 0,
    }));

    const [tool, setTool] = useState<ArtTool | null>(null);

    const [size, setSize] = useState(1);

    const [materials, setMaterials] = useState<Materials>({
        floor: DEFAULT_ART.floor,
        wall: DEFAULT_ART.wall,
        blocked: null,
        opening: { kind: 'door', material: DEFAULT_ART.door, locked: false },
    });

    const [selectedLight, setSelectedLight] = useState<string | null>(null);

    const [lastNotice, setLastNotice] = useState<LogLine | null>(null);

    const chunkCache = useRef(new WeakMap<MapArtScene, FloorChunks>());

    const raw = history.present;

    const rawRef = useRef(raw);

    useEffect(() => {
        rawRef.current = raw;
    }, [raw]);

    const mapRef = useRef(map);

    useEffect(() => {
        mapRef.current = map;
    }, [map]);

    const chunksOf = useCallback((scene: MapArtScene): FloorChunks => {
        let chunks = chunkCache.current.get(scene);

        if (!chunks) {
            chunks = decodeFloors(scene.floors);
            chunkCache.current.set(scene, chunks);
        }

        return chunks;
    }, []);

    const commit = useCallback((next: MapArtScene, chunks?: FloorChunks) => {
        if (chunks) chunkCache.current.set(next, chunks);

        setHistory((h) =>
            h.present === next
                ? h
                : {
                      ...h,
                      past: h.present
                          ? [...h.past, h.present].slice(-HISTORY_LIMIT)
                          : h.past,
                      present: next,
                      future: [],
                      revision: h.revision + 1,
                  }
        );
    }, []);

    const { cols, rows, gridType } = map;

    const scene = useMemo(
        () => (raw ? clipScene(raw, { cols, rows, gridType }) : null),
        [raw, cols, rows, gridType]
    );

    const start = useCallback(() => {
        const next = sceneFromMap(mapRef.current);

        setHistory((h) => ({
            past: [],
            present: next,
            future: [],
            saved: next,
            revision: h.revision + 1,
        }));
    }, []);

    const reset = useCallback((record: MapArtRecord) => {
        setHistory((h) => ({
            past: [],
            present: record.scene,
            future: [],
            saved: record.scene,
            revision: h.revision + 1,
        }));
    }, []);

    const markSaved = useCallback((saved: MapArtScene) => {
        setHistory((h) => ({ ...h, present: saved, saved }));
    }, []);

    const undo = useCallback(() => {
        setHistory((h) => {
            const prev = h.past[h.past.length - 1];

            if (!prev || !h.present) return h;

            return {
                ...h,
                past: h.past.slice(0, -1),
                present: prev,
                future: [h.present, ...h.future].slice(0, HISTORY_LIMIT),
                revision: h.revision + 1,
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((h) => {
            const [next, ...rest] = h.future;

            if (!next || !h.present) return h;

            return {
                ...h,
                past: [...h.past, h.present].slice(-HISTORY_LIMIT),
                present: next,
                future: rest,
                revision: h.revision + 1,
            };
        });
    }, []);

    const setMaterial = useCallback((patch: MaterialsPatch) => {
        setMaterials((m) => ({
            ...m,
            ...patch,
            opening: { ...m.opening, ...patch.opening },
        }));
    }, []);

    const paintFloor = useCallback(
        (
            base: MapArtScene,
            points: readonly GridPoint[],
            code: number,
            brushSize: number,
            editTool: TileEditTool
        ): MapArtScene => {
            const result = applyFloorStroke({
                chunks: chunksOf(base),
                points,
                code,
                brushSize,
                tool: editTool,
                map: mapRef.current,
            });

            if (result.changes.length === 0) return base;

            const next = { ...base, floors: encodeFloors(result.chunks) };

            chunkCache.current.set(next, result.chunks);

            return next;
        },
        [chunksOf]
    );

    const onCellStroke = useCallback(
        (cells: GridPoint[]) => {
            const base = rawRef.current;

            if (!base || !tool || cells.length === 0) return;

            const floorTool = FLOOR_TOOLS[tool];

            if (floorTool) {
                const code = tool === 'floor-erase' ? 0 : materials.floor;

                commit(paintFloor(base, cells, code, size, floorTool));

                return;
            }

            if (tool === 'room') {
                const first = cells[0];

                const last = cells[cells.length - 1];

                const room = roomPerimeter(mapRef.current, first, last);

                const walls = { ...base.walls };

                for (const k of room.edges) walls[k] = materials.wall;

                const painted = paintFloor(
                    { ...base, walls },
                    room.cells,
                    materials.floor,
                    1,
                    'brush'
                );

                commit(painted);

                return;
            }

            if (tool === 'blocked') {
                const key = cellKey(cells[0]);

                if (key in base.blocked) {
                    commit({ ...base, blocked: withoutKeys(base.blocked, [key]) });

                    return;
                }

                if (
                    Object.keys(base.blocked).length >= MAP_LIMITS.maxTerrainCells
                ) {
                    setLastNotice(notice('terrainLimit'));

                    return;
                }

                commit({
                    ...base,
                    blocked: { ...base.blocked, [key]: materials.blocked },
                });

                return;
            }

            if (tool === 'light') {
                if (base.lights.length >= MAX_LIGHTS) {
                    setLastNotice(notice('lightLimit'));

                    return;
                }

                const at = cellCenter(cells[0], gridOf(mapRef.current));

                const light: MapArtLight = {
                    id: crypto.randomUUID(),
                    x: at.x,
                    y: at.y,
                    radius: unitOf(4),
                    color: '#ffb347',
                    intensity: 0.8,
                };

                commit({ ...base, lights: [...base.lights, light] });

                setSelectedLight(light.id);
            }
        },
        [tool, materials, size, commit, paintFloor]
    );

    const edgeEditing = useMemo<EdgeEditing | null>(() => {
        if (!raw) return null;

        if (tool === 'wall' || tool === 'wall-erase') {
            const erase = tool === 'wall-erase';

            return {
                existing: new Set(Object.keys(raw.walls)),
                ...(erase && { erase: true }),
                onCommit: (add: string[], remove: string[]) => {
                    const walls = { ...raw.walls };

                    if (!erase) for (const k of add) walls[k] = materials.wall;

                    for (const k of remove) delete walls[k];

                    commit({
                        ...raw,
                        walls,
                        openings: withoutKeys(raw.openings, remove),
                    });
                },
            };
        }

        if (tool === 'opening') {
            const { kind, material, locked } = materials.opening;

            return {
                existing: new Set(Object.keys(raw.openings)),
                onCommit: (add: string[], remove: string[]) => {
                    const onWall = add.filter((k) => k in raw.walls);

                    if (onWall.length < add.length)
                        setLastNotice(notice('openingNeedsWall'));

                    const openings = withoutKeys(raw.openings, remove);

                    for (const k of onWall)
                        openings[k] = {
                            kind,
                            material,
                            ...(kind === 'door' && locked && { locked: true }),
                        };

                    commit({ ...raw, openings });
                },
            };
        }

        return null;
    }, [raw, tool, materials, commit]);

    const updateLights = useCallback(
        (fn: (lights: MapArtLight[]) => MapArtLight[]) => {
            const base = rawRef.current;

            if (base) commit({ ...base, lights: fn(base.lights) });
        },
        [commit]
    );

    const lights = {
            selectedId: selectedLight,
            select: setSelectedLight,
            move: (id: string, at: Point) =>
                updateLights((all) =>
                    all.map((l) => (l.id === id ? { ...l, x: at.x, y: at.y } : l))
                ),
            update: (id: string, patch: Partial<Omit<MapArtLight, 'id'>>) =>
                updateLights((all) =>
                    all.map((l) => (l.id === id ? { ...l, ...patch } : l))
                ),
            remove: (id: string) => {
                updateLights((all) => all.filter((l) => l.id !== id));
                setSelectedLight((cur) => (cur === id ? null : cur));
            },
    };

    const setAmbient = useCallback(
        (patch: Partial<MapArtScene['ambient']>) => {
            const base = rawRef.current;

            if (base) commit({ ...base, ambient: { ...base.ambient, ...patch } });
        },
        [commit]
    );

    return {
        active: raw !== null,
        scene,
        revision: history.revision,
        start,
        reset,
        tool,
        setTool,
        brush: { size, setSize },
        materials: { ...materials, set: setMaterial },
        onCellStroke,
        edgeEditing,
        lights,
        setAmbient,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        isDirty: raw !== history.saved,
        markSaved,
        notice: lastNotice,
        clearNotice: () => setLastNotice(null),
    };
}
