'use client';

import { useCallback, useMemo, useState } from 'react';

import {
    DEFAULT_BATTLE_MAP,
    DEFAULT_HAZARD_DAMAGE_TYPE,
    DEFAULT_HAZARD_DICE,
    DEFAULT_MAP_BACKGROUND,
} from '@/lib/constants/battle';
import type { EdgeEditing } from '@/lib/hooks/battle/useEdgeStroke';
import { useMapMotionTool } from '@/lib/hooks/battle/useMapMotionTool';
import { useImageSize } from '@/lib/hooks/common';
import { textRef } from '@/lib/i18n/text-ref';
import {
    applyMargins,
    clampMargins,
    type EdgeOp,
    type GridCalibration,
    gridForCellSize,
    hasPlayableArea,
    hazardDamage,
    type ImageSize,
    impliedCellPx,
    inferMargins,
    isEdgeTool,
    isPreviewSafeBackground,
    type Margins,
    MAX_SIDE,
    MIN_SIDE,
    paintCells,
    paintDoors,
    paintEdges,
    resizeMap,
    type SetupTool,
    wallSet,
} from '@/lib/utils/battle/grid';
import {
    MAP_MODE_REGISTRY,
    type MapModeDefinition,
    type MapModeKey,
} from '@/lib/utils/battle/modes';
import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig, GridPoint, MapMotion } from '@/types/battle';
import type { LogLine } from '@/types/text';

const MODE_KEYS = Object.keys(MAP_MODE_REGISTRY) as MapModeKey[];

const modeOf = (key: MapModeKey) =>
    MAP_MODE_REGISTRY[key] as MapModeDefinition<unknown>;

interface KeptCalibration {
    size: ImageSize;
    calibration: Partial<GridCalibration>;
}

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

/** Hazard brush; empty dice means a hazard without damage */
export interface HazardBrush {
    label: string;
    dice: string;
    damageType: string;
}

const DEFAULT_BRUSH: HazardBrush = {
    label: '',
    dice: DEFAULT_HAZARD_DICE,
    damageType: DEFAULT_HAZARD_DAMAGE_TYPE,
};

export const NO_PLAYABLE_NOTICE = textRef('battleSetup.map.noPlayable');

export const EDGE_LIMIT_NOTICE = textRef('battleSetup.map.edgeLimit');

export const DOOR_LIMIT_NOTICE = textRef('battleSetup.map.doorLimit');

export const EDGES_STRIPPED_NOTICE = textRef('battleSetup.map.edgesStripped');

export function useBattleMapEditor(
    initial: BattleMapConfig | null | undefined,
    { maxSide = MAX_SIDE }: { maxSide?: number } = {}
) {
    const [enabled, setEnabledState] = useState(Boolean(initial));

    const [map, setMap] = useState<BattleMapConfig>(
        () => initial ?? { ...DEFAULT_BATTLE_MAP }
    );

    const [margins, setMarginsState] = useState<Margins>(() =>
        initial ? inferMargins(initial) : NO_MARGINS
    );

    const [tool, setToolState] = useState<SetupTool | null>(null);

    const [brush, setBrushState] = useState<HazardBrush>(DEFAULT_BRUSH);

    const setBrush = useCallback(
        (patch: Partial<HazardBrush>) =>
            setBrushState((b) => ({ ...b, ...patch })),
        []
    );

    const [doorLocked, setDoorLocked] = useState(false);

    const [notice, setNotice] = useState<LogLine | null>(null);

    const setEnabled = useCallback((value: boolean) => {
        setEnabledState(value);

        if (!value) setNotice(null);
    }, []);

    const setTool = useCallback((value: SetupTool | null) => {
        setToolState(value);
        setNotice(null);
    }, []);

    const imageSrc = isPreviewSafeBackground(map.background)
        ? map.background
        : DEFAULT_MAP_BACKGROUND;

    const image = useImageSize(enabled ? imageSrc : null);

    const resize = useCallback(
        (
            cols: number,
            rows: number,
            calibration?: Partial<GridCalibration>
        ) => {
            cols = Math.min(cols, maxSide);
            rows = Math.min(rows, maxSide);

            const nextMargins = clampMargins({ cols, rows }, margins);

            const {
                backgroundCols: _cols,
                backgroundRows: _rows,
                ...sized
            } = applyMargins(
                resizeMap(applyMargins(map, NO_MARGINS, margins), cols, rows),
                nextMargins,
                NO_MARGINS
            );

            const next = { ...sized, ...calibration };

            if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

            setNotice(null);
            setMap(next);
            setMarginsState(nextMargins);
        },
        [map, margins, maxSide]
    );

    // ручний розмір скидає масштаб фону: він знову вписується в сітку, а повзунок показує нову клітинку
    const setSize = useCallback(
        (cols: number, rows: number) => resize(cols, rows),
        [resize]
    );

    const setCellSize = useCallback(
        (cellPx: number) => {
            if (!image) return;

            const grid = gridForCellSize(image, cellPx);

            resize(grid.cols, grid.rows, {
                backgroundCols: grid.backgroundCols,
            });
        },
        [image, resize]
    );

    const applyCalibration = useCallback(
        (calibration: GridCalibration) =>
            resize(
                clamp(
                    Math.round(calibration.backgroundCols),
                    MIN_SIDE,
                    MAX_SIDE
                ),
                clamp(
                    Math.round(calibration.backgroundRows),
                    MIN_SIDE,
                    MAX_SIDE
                ),
                calibration
            ),
        [resize]
    );

    const setGridOffset = useCallback(
        (gridOffset: { x: number; y: number }) =>
            setMap((m) => ({ ...m, gridOffset })),
        []
    );

    const setMargins = useCallback(
        (next: Margins) => {
            const nextMap = applyMargins(map, next, margins);

            if (!hasPlayableArea(nextMap)) return setNotice(NO_PLAYABLE_NOTICE);

            setNotice(null);
            setMap(nextMap);
            setMarginsState(next);
        },
        [map, margins]
    );

    const setOpacity = useCallback(
        (opacity: number) => setMap((m) => ({ ...m, opacity })),
        []
    );

    const [kept, setKept] = useState<KeptCalibration | null>(null);

    // масштаб і зсув належать старому фону; той самий розмір нового зображення дає вибір їх зберегти
    const setBackground = useCallback(
        (background: string | null) => {
            const { backgroundCols, backgroundRows, gridOffset } = map;

            const calibration = { backgroundCols, backgroundRows, gridOffset };

            setKept(
                image && Object.values(calibration).some(Boolean)
                    ? { size: image, calibration }
                    : null
            );
            setMap(
                ({
                    backgroundCols: _cols,
                    backgroundRows: _rows,
                    gridOffset: _offset,
                    ...m
                }) => ({ ...m, background })
            );
        },
        [map, image]
    );

    const replaceBackground = useCallback(
        (background: string | null) => setMap((m) => ({ ...m, background })),
        []
    );

    const pendingKeep =
        kept &&
        image &&
        image.width === kept.size.width &&
        image.height === kept.size.height
            ? kept.calibration
            : null;

    const keepCalibration = useCallback(() => {
        if (pendingKeep) setMap((m) => ({ ...m, ...pendingKeep }));

        setKept(null);
    }, [pendingKeep]);

    const dropCalibration = useCallback(() => setKept(null), []);

    const setMode = useCallback(
        (key: MapModeKey, on: boolean) => {
            const mode = modeOf(key);

            // один режим на бій; у режимі core-стіни/ґрати недоступні для редагування, тож зникають разом із ввімкненням
            setMap((m) => {
                const { walls, bars, doors, ...base } = m;

                return mode.withConfig(
                    MODE_KEYS.reduce(
                        (acc, other) =>
                            other === key
                                ? acc
                                : modeOf(other).withConfig(acc, null),
                        on ? base : m
                    ),
                    on ? (mode.emptyConfig?.() ?? null) : null
                );
            });

            if (on) {
                setToolState(null);
                setNotice(
                    map.walls?.length || map.bars?.length || map.doors
                        ? EDGES_STRIPPED_NOTICE
                        : null
                );
            }
        },
        [map.walls, map.bars, map.doors]
    );

    const setMotion = useCallback(
        (motion: MapMotion | null) => setMap((m) => ({ ...m, motion })),
        []
    );

    const motionMutation = useMemo(
        () => ({
            mutate: ({ motion }: { motion: MapMotion | null }) =>
                setMotion(motion),
            isPending: false,
        }),
        [setMotion]
    );

    const motionTool = useMapMotionTool({
        isDM: true,
        current: map.motion ?? null,
        mutation: motionMutation,
    });

    const onStroke = useCallback(
        (cells: GridPoint[]) => {
            if (!tool || isEdgeTool(tool) || cells.length === 0) return;

            const hazard =
                tool === 'hazard'
                    ? {
                          label: brush.label.trim(),
                          damage: hazardDamage(brush.dice, brush.damageType),
                      }
                    : undefined;

            const next = paintCells(map, cells, tool, hazard);

            if (!hasPlayableArea(next)) return setNotice(NO_PLAYABLE_NOTICE);

            setNotice(null);
            setMap(next);
        },
        [tool, map, brush]
    );

    const activeMode =
        MODE_KEYS.find((key) => modeOf(key).configOf(map) !== null) ?? null;

    const edgeTool = isEdgeTool(tool) && !activeMode ? tool : null;

    const edgeEditing = useMemo<EdgeEditing | null>(() => {
        if (!edgeTool) return null;

        const walls = wallSet(map.walls);

        const bars = wallSet(map.bars);

        if (edgeTool === 'edge-door') {
            return {
                existing: new Set(Object.keys(map.doors ?? {})),
                onCommit: (add: string[], remove: string[]) => {
                    const result = paintDoors(map, { add, remove }, doorLocked);

                    if (result.overflow) setNotice(DOOR_LIMIT_NOTICE);

                    setMap(result.map);
                },
            };
        }

        const ops: [EdgeOp, EdgeOp] | null =
            edgeTool === 'edge-erase'
                ? null
                : edgeTool === 'edge-wall'
                  ? ['add-walls', 'remove-walls']
                  : ['add-bars', 'remove-bars'];

        const paint = (m: BattleMapConfig, add: string[], remove: string[]) => {
            if (!ops) return paintEdges(m, remove, 'erase');

            const added = paintEdges(m, add, ops[0]);

            const removed = paintEdges(added.map, remove, ops[1]);

            return {
                map: removed.map,
                overflow: added.overflow || removed.overflow,
            };
        };

        const onCommit = (add: string[], remove: string[]) => {
            const result = paint(map, add, remove);

            if (result.overflow) setNotice(EDGE_LIMIT_NOTICE);

            setMap(result.map);
        };

        if (edgeTool === 'edge-erase')
            return {
                existing: new Set([
                    ...walls,
                    ...bars,
                    ...Object.keys(map.doors ?? {}),
                ]),
                erase: true,
                onCommit,
            };

        return {
            existing: edgeTool === 'edge-wall' ? walls : bars,
            onCommit,
        };
    }, [edgeTool, map, doorLocked]);

    return {
        edgeEditing,
        state: {
            enabled,
            map,
            mode: activeMode,
            margins,
            tool,
            doorLocked,
            notice,
            value: enabled ? map : null,
            cellPx: image ? impliedCellPx(map, image) : null,
            image,
            imageSrc,
            pendingKeep,
        },
        brush,
        motionTool,
        actions: {
            setEnabled,
            setSize,
            setCellSize,
            setGridOffset,
            applyCalibration,
            keepCalibration,
            dropCalibration,
            setOpacity,
            setMargins,
            setTool,
            setDoorLocked,
            setBackground,
            replaceBackground,
            setBrush,
            setMode,
            onStroke,
        },
    };
}

export type BattleMapEditor = ReturnType<typeof useBattleMapEditor>;
