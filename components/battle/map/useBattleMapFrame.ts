import { useMemo } from 'react';

import {
    cameraBounds,
    focusCellPx,
    type Frame,
    needsCamera,
} from '@/lib/utils/battle/camera';
import {
    fitMapView,
    mapSize,
    MIN_TAP_CELL_PX,
    playableBounds,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig, GridKind } from '@/types/battle-grid';

const FIT_ZOOM_BOUNDS = { min: 1, max: 3 };

const DESKTOP_MAX_CROP = 0.25;

export function useBattleMapFrame(
    map: BattleMapConfig,
    avail: { width: number; height: number },
    phone: boolean,
    grid: GridKind
) {
    const { cols, rows } = map;

    const win = useMemo(
        () =>
            phone && grid !== 'hex'
                ? playableBounds(map)
                : { x: 0, y: 0, cols, rows },
        [phone, grid, map, cols, rows]
    );

    const fit = useMemo(
        () =>
            fitMapView(avail, win, {
                rotatable: phone,
                bothWays: !phone,
                fillWidth: phone,
                taller: 1,
                minCell: MIN_TAP_CELL_PX,
                grid,
                cover: phone ? undefined : DESKTOP_MAX_CROP,
            }),
        [avail, win, phone, grid]
    );

    const cameraMode = needsCamera(fit);

    const fitAll = useMemo(
        () =>
            cameraMode
                ? fitMapView(avail, win, {
                      rotatable: false,
                      bothWays: false,
                      fillWidth: false,
                      taller: 1,
                      grid,
                      cover: phone ? Infinity : DESKTOP_MAX_CROP,
                  })
                : fit,
        [cameraMode, avail, win, fit, phone, grid]
    );

    const renderedFit = cameraMode ? fitAll : fit;

    const scrollsX = phone && fit.width > avail.width + 0.5;

    const scrollsY = phone && fit.height > avail.height + 0.5;

    const scrolls = scrollsX || scrollsY;

    const spanWidth = mapSize(win, grid).width;

    const pxPerUnit = renderedFit.width / spanWidth;

    const gridCols = spanWidth / UNIT;

    const frame = useMemo<Frame | null>(() => {
        if (avail.width <= 0 || avail.height <= 0) return null;

        if (!cameraMode)
            return {
                avail: { width: fit.width, height: fit.height },
                content: { width: fit.width, height: fit.height },
                bounds: FIT_ZOOM_BOUNDS,
                inset: phone
                    ? undefined
                    : {
                          width: Math.max(0, (fit.width - avail.width) / 2),
                          height: Math.max(0, (fit.height - avail.height) / 2),
                      },
            };

        const fitCell = fitAll.width / gridCols;

        const focusPx = focusCellPx(avail);

        return {
            avail,
            content: { width: fitAll.width, height: fitAll.height },
            bounds: cameraBounds(fitCell, focusPx),
            focusZoom: Math.max(1, focusPx / fitCell),
        };
    }, [
        cameraMode,
        phone,
        avail,
        fit.width,
        fit.height,
        fitAll.width,
        fitAll.height,
        gridCols,
    ]);

    return {
        win,
        fit,
        fitAll,
        renderedFit,
        cameraMode,
        scrollsX,
        scrollsY,
        scrolls,
        pxPerUnit,
        frame,
    };
}
