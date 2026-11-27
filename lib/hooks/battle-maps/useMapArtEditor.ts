'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MAP_ART_LIMITS } from '@/lib/constants/map-art/limits';
import { DEFAULT_ART } from '@/lib/constants/map-art/materials';
import { isStampId, stampDef } from '@/lib/constants/map-art/stamps';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { cellKey, gridOf } from '@/lib/utils/battle/grid/geometry';
import {
    cellCenter,
    mapSize,
    UNIT,
    unitOf,
} from '@/lib/utils/battle/grid/layout';
import {
    applyFloorStroke,
    clipScene,
    decodeFloors,
    encodeFloors,
    type FloorChunks,
    type MapDims,
    renumberZ,
    roomPerimeter,
    sceneFromMap,
    snapStampCenter,
} from '@/lib/utils/battle/map-art';
import { brushFootprint, type TileEditTool } from '@/lib/utils/battle/tiles/edit';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type {
    MapArtLight,
    MapArtRecord,
    MapArtScene,
    MapArtStamp,
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
    | 'light'
    | 'stamp'
    | 'stamp-select';

export const isStampTool = (
    tool: string | null
): tool is 'stamp' | 'stamp-select' =>
    tool === 'stamp' || tool === 'stamp-select';

export interface EditorStamps {
    asset: string | null;
    setAsset(id: string | null): void;
    snap: boolean;
    setSnap(v: boolean): void;
    showAllBlocking: boolean;
    setShowAllBlocking(v: boolean): void;
    ghost: { rot: number; flip: boolean };
    rotateGhost(dir: 1 | -1): void;
    flipGhost(): void;
    selectedId: string | null;
    select(id: string | null): void;
    place(at: Point): void;
    update(
        id: string,
        patch: Partial<Omit<MapArtStamp, 'id'>>,
        coalesceKey?: string
    ): void;
    remove(id: string): void;
    duplicate(id: string): void;
    reorder(id: string, dir: 1 | -1): void;
}

export const STAMP_SCALE = MAP_ART_LIMITS.stampScale;

const GHOST_STEP = 15;

const normalizeRot = (rot: number): number => ((rot % 360) + 360) % 360;

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
    coalesceKey: string | null;
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

const dropUnknownStamps = (
    scene: MapArtScene
): { scene: MapArtScene; dropped: number } => {
    const stamps = scene.stamps.filter((s) => isStampId(s.asset));

    const dropped = scene.stamps.length - stamps.length;

    return dropped ? { scene: { ...scene, stamps }, dropped } : { scene, dropped };
};

const unknownStampsNotice = (count: number): LogLine => ({
    message: 'maps.editor.art.notice.unknownStamps',
    params: { count },
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
    const [cleanedInitial] = useState(() =>
        initial ? dropUnknownStamps(initial) : null
    );

    const [history, setHistory] = useState<History>(() => ({
        past: [],
        present: cleanedInitial?.scene ?? null,
        future: [],
        saved: initial,
        revision: 0,
        coalesceKey: null,
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

    const [stampAsset, setStampAsset] = useState<string | null>(null);

    const [snap, setSnap] = useState(true);

    const [showAllBlocking, setShowAllBlocking] = useState(false);

    const [ghost, setGhost] = useState({ rot: 0, flip: false });

    const [selectedStamp, setSelectedStamp] = useState<string | null>(null);

    const stampSeq = useRef(0);

    const [lastNotice, setLastNotice] = useState<LogLine | null>(() =>
        cleanedInitial?.dropped ? unknownStampsNotice(cleanedInitial.dropped) : null
    );

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

    const commit = useCallback(
        (next: MapArtScene, coalesceKey: string | null = null) => {
            setHistory((h) => {
                if (h.present === next) return h;

                const merge = coalesceKey !== null && h.coalesceKey === coalesceKey;

                return {
                    ...h,
                    past:
                        h.present && !merge
                            ? [...h.past, h.present].slice(-HISTORY_LIMIT)
                            : h.past,
                    present: next,
                    future: [],
                    revision: h.revision + 1,
                    coalesceKey,
                };
            });
        },
        []
    );

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
            coalesceKey: null,
        }));
    }, []);

    const reset = useCallback((record: MapArtRecord) => {
        const { scene: cleaned, dropped } = record.scene
            ? dropUnknownStamps(record.scene)
            : { scene: null, dropped: 0 };

        if (dropped) setLastNotice(unknownStampsNotice(dropped));

        setHistory((h) => ({
            past: [],
            present: cleaned,
            future: [],
            saved: record.scene,
            revision: h.revision + 1,
            coalesceKey: null,
        }));
    }, []);

    const markSaved = useCallback((saved: MapArtScene) => {
        setHistory((h) => ({ ...h, present: saved, saved, coalesceKey: null }));
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
                coalesceKey: null,
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
                coalesceKey: null,
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

                const painted = paintFloor(base, cells, code, size, floorTool);

                const keys = [
                    ...brushFootprint(cells, size, mapRef.current, gridOf(mapRef.current)).keys(),
                ];

                // blocked is derived from the scene on save, so erasing must drop it here
                commit(
                    tool === 'floor-erase' && keys.some((k) => k in painted.blocked)
                        ? { ...painted, blocked: withoutKeys(painted.blocked, keys) }
                        : painted
                );

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

                    if (!onWall.length && !remove.length) return;

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
        (fn: (lights: MapArtLight[]) => MapArtLight[], coalesceKey?: string) => {
            const base = rawRef.current;

            if (base) commit({ ...base, lights: fn(base.lights) }, coalesceKey);
        },
        [commit]
    );

    const lights = {
            selectedId: selectedLight,
            select: setSelectedLight,
            move: (id: string, at: Point) =>
                updateLights(
                    (all) =>
                        all.map((l) =>
                            l.id === id ? { ...l, x: at.x, y: at.y } : l
                        ),
                    `move:${id}`
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

    const newStampId = () =>
        `s${Date.now().toString(36)}${(stampSeq.current++).toString(36)}`;

    const stamps = useMemo<EditorStamps>(() => {
        const edit = (
            fn: (all: MapArtStamp[]) => MapArtStamp[],
            coalesceKey?: string
        ) => {
            const base = rawRef.current;

            if (base) commit({ ...base, stamps: fn(base.stamps) }, coalesceKey);
        };

        const topZ = (all: readonly MapArtStamp[]) =>
            all.reduce((z, s) => Math.max(z, s.z), -1) + 1;

        const full = () => {
            if ((rawRef.current?.stamps.length ?? 0) < MAP_ART_LIMITS.stamps)
                return false;

            setLastNotice({ message: 'maps.editor.stamps.limit' });

            return true;
        };

        const clampTo = (p: Point): Point => {
            const { width, height } = mapSize(
                mapRef.current,
                gridOf(mapRef.current)
            );

            return {
                x: Math.min(width, Math.max(0, p.x)),
                y: Math.min(height, Math.max(0, p.y)),
            };
        };

        return {
            asset: stampAsset,
            setAsset: setStampAsset,
            snap,
            setSnap,
            showAllBlocking,
            setShowAllBlocking,
            ghost,
            rotateGhost: (dir) =>
                setGhost((g) => ({
                    ...g,
                    rot: normalizeRot(g.rot + dir * GHOST_STEP),
                })),
            flipGhost: () => setGhost((g) => ({ ...g, flip: !g.flip })),
            selectedId: selectedStamp,
            select: setSelectedStamp,
            place: (at) => {
                const base = rawRef.current;

                if (!base || !stampAsset || full()) return;

                const def = stampDef(stampAsset);

                const pos = clampTo(
                    snap && def
                        ? snapStampCenter(
                              at,
                              { cols: def.cols, rows: def.rows, rot: ghost.rot },
                              mapRef.current
                          )
                        : at
                );

                const stamp: MapArtStamp = {
                    id: newStampId(),
                    asset: stampAsset,
                    ...pos,
                    rot: ghost.rot,
                    scale: 1,
                    flip: ghost.flip,
                    z: topZ(base.stamps),
                };

                edit((all) => renumberZ([...all, stamp]));
            },
            update: (id, patch, coalesceKey) =>
                edit(
                    (all) =>
                        all.map((s) => {
                            if (s.id !== id) return s;

                            const next = { ...s, ...patch };

                            const def = stampDef(s.asset);

                            if (snap && def && 'x' in patch && 'y' in patch)
                                Object.assign(
                                    next,
                                    snapStampCenter(
                                        next,
                                        { cols: def.cols, rows: def.rows, rot: next.rot },
                                        mapRef.current
                                    )
                                );

                            return {
                                ...next,
                                rot: normalizeRot(next.rot),
                                scale: Math.min(
                                    STAMP_SCALE.max,
                                    Math.max(STAMP_SCALE.min, next.scale)
                                ),
                                ...clampTo(next),
                            };
                        }),
                    coalesceKey
                ),
            remove: (id) => {
                edit((all) => all.filter((s) => s.id !== id));
                setSelectedStamp((cur) => (cur === id ? null : cur));
            },
            duplicate: (id) => {
                const base = rawRef.current;

                const src = base?.stamps.find((s) => s.id === id);

                if (!base || !src || full()) return;

                const copy: MapArtStamp = {
                    ...src,
                    ...clampTo({ x: src.x + UNIT / 2, y: src.y + UNIT / 2 }),
                    id: newStampId(),
                    z: topZ(base.stamps),
                };

                edit((all) => renumberZ([...all, copy]));
                setSelectedStamp(copy.id);
            },
            reorder: (id, dir) =>
                edit((all) =>
                    renumberZ(
                        all.map((s) => (s.id === id ? { ...s, z: s.z + dir } : s))
                    )
                ),
        };
    }, [stampAsset, snap, showAllBlocking, ghost, selectedStamp, commit]);

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
        stamps,
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
