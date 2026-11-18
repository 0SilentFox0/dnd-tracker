import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { NO_PLAYABLE_NOTICE } from './mapEditorNotices';

import {
    applyMargins,
    clampMargins,
    type GridCalibration,
    gridForCellSize,
    hasPlayableArea,
    type ImageSize,
    type Margins,
    MAX_SIDE,
    MIN_SIDE,
    resizeMap,
} from '@/lib/utils/battle/grid';
import { clamp } from '@/lib/utils/common/clamp';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

export function useMapGridSizing({
    map,
    setMap,
    margins,
    setMargins: setMarginsState,
    setNotice,
    image,
    maxSide,
}: {
    map: BattleMapConfig;
    setMap: Dispatch<SetStateAction<BattleMapConfig>>;
    margins: Margins;
    setMargins(margins: Margins): void;
    setNotice(notice: LogLine | null): void;
    image: ImageSize | null;
    maxSide: { photo: number; tile: number };
}) {
    const resize = useCallback(
        (
            cols: number,
            rows: number,
            calibration?: Partial<GridCalibration>
        ) => {
            const limit = map.background ? maxSide.photo : maxSide.tile;

            cols = Math.min(cols, limit);
            rows = Math.min(rows, limit);

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
        [map, margins, maxSide, setMap, setMarginsState, setNotice]
    );

    // a manual size resets the background scale: it refits the grid, and the slider shows the new cell
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
        [setMap]
    );

    const setMargins = useCallback(
        (next: Margins) => {
            const nextMap = applyMargins(map, next, margins);

            if (!hasPlayableArea(nextMap)) return setNotice(NO_PLAYABLE_NOTICE);

            setNotice(null);
            setMap(nextMap);
            setMarginsState(next);
        },
        [map, margins, setMap, setMarginsState, setNotice]
    );

    return {
        setSize,
        setCellSize,
        applyCalibration,
        setGridOffset,
        setMargins,
    };
}
