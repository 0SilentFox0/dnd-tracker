'use client';

import { useCallback, useMemo, useState } from 'react';

import { EDGES_STRIPPED_NOTICE, NO_PLAYABLE_NOTICE } from './mapEditorNotices';
import { useMapBackground } from './useMapBackground';
import { useMapEdgeEditing } from './useMapEdgeEditing';
import { NO_MARGINS, useMapGridSizing } from './useMapGridSizing';

import {
    DEFAULT_BATTLE_MAP,
    DEFAULT_HAZARD_DAMAGE_TYPE,
    DEFAULT_HAZARD_DICE,
    DEFAULT_MAP_BACKGROUND,
} from '@/lib/constants/battle';
import { useMapMotionTool } from '@/lib/hooks/battle/useMapMotionTool';
import { useImageSize } from '@/lib/hooks/common';
import {
    gridOf,
    hasPlayableArea,
    hazardDamage,
    impliedCellPx,
    inferMargins,
    isEdgeTool,
    isPreviewSafeBackground,
    type Margins,
    MAX_SIDE,
    paintCells,
    type SetupTool,
} from '@/lib/utils/battle/grid';
import {
    MAP_MODE_REGISTRY,
    type MapModeDefinition,
    type MapModeKey,
} from '@/lib/utils/battle/modes';
import type {
    BattleMapConfig,
    GridKind,
    GridPoint,
    MapMotion,
} from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

const MODE_KEYS = Object.keys(MAP_MODE_REGISTRY) as MapModeKey[];

const modeOf = (key: MapModeKey) =>
    MAP_MODE_REGISTRY[key] as MapModeDefinition<unknown>;

const supportsGrid = (key: MapModeKey, grid: GridKind) =>
    modeOf(key).grids?.includes(grid) ?? true;

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

export {
    DOOR_LIMIT_NOTICE,
    EDGE_LIMIT_NOTICE,
    EDGES_STRIPPED_NOTICE,
    NO_PLAYABLE_NOTICE,
} from './mapEditorNotices';

export function useBattleMapEditor(
    initial: BattleMapConfig | null | undefined,
    {
        maxSide = { photo: MAX_SIDE, tile: MAX_SIDE },
    }: { maxSide?: { photo: number; tile: number } } = {}
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

    const {
        setSize,
        setCellSize,
        applyCalibration,
        setGridOffset,
        setMargins,
    } = useMapGridSizing({
        map,
        setMap,
        margins,
        setMargins: setMarginsState,
        setNotice,
        image,
        maxSide,
    });

    const setOpacity = useCallback(
        (opacity: number) => setMap((m) => ({ ...m, opacity })),
        []
    );

    const {
        setBackground,
        replaceBackground,
        pendingKeep,
        keepCalibration,
        dropCalibration,
    } = useMapBackground({ map, setMap, image });

    const replaceMapFromImport = useCallback(
        (
            imported: Pick<
                BattleMapConfig,
                | 'cols'
                | 'rows'
                | 'background'
                | 'backgroundCols'
                | 'walls'
                | 'doors'
            >
        ) => {
            setMap((m) => ({
                ...m,
                ...imported,
                bars: [],
                gridType: 'square',
                backgroundRows: undefined,
                blocked: undefined,
                terrain: undefined,
                gridOffset: undefined,
                maze: null,
                weather: null,
                motion: null,
            }));
            setToolState(null);
            setMarginsState(NO_MARGINS);
            setNotice(null);
        },
        []
    );

    const setMode = useCallback(
        (key: MapModeKey, on: boolean) => {
            const mode = modeOf(key);

            if (on && !supportsGrid(key, gridOf(map))) return;

            // one mode per battle; in a mode, core walls/grates are not editable and disappear when it is enabled
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
        [map]
    );

    const setGridType = useCallback((kind: GridKind) => {
        setMap((m) => {
            if (gridOf(m) === kind) return m;

            if (kind === 'square') return { ...m, gridType: 'square' };

            const { walls, bars, doors, ...rest } = m;

            return MODE_KEYS.reduce(
                (acc, key) => modeOf(key).withConfig(acc, null),
                { ...rest, gridType: 'hex' } as BattleMapConfig
            );
        });
        setToolState(null);
        setNotice(null);
    }, []);

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

    const edgeEditing = useMapEdgeEditing({
        map,
        setMap,
        setNotice,
        tool,
        modeActive: !!activeMode,
        doorLocked,
    });

    return {
        edgeEditing,
        state: {
            enabled,
            map,
            mode: activeMode,
            grid: gridOf(map),
            modeSupported: (key: MapModeKey) => supportsGrid(key, gridOf(map)),
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
            replaceMapFromImport,
            setBrush,
            setMode,
            setGridType,
            onStroke,
        },
    };
}

export type BattleMapEditor = ReturnType<typeof useBattleMapEditor>;
