import { useMemo } from 'react';

import {
    cameraBounds,
    focusCellPx,
    type Frame,
    needsCamera,
} from '@/lib/utils/battle/camera';
import {
    fitMapView,
    MIN_TAP_CELL_PX,
    playableBounds,
    UNIT,
    viewCellPx,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

const FIT_ZOOM_BOUNDS = { min: 1, max: 3 };

export function useBattleMapFrame(
    map: BattleMapConfig,
    avail: { width: number; height: number },
    phone: boolean
) {
    const { cols, rows } = map;

    const win = useMemo(
        () => (phone ? playableBounds(map) : { x: 0, y: 0, cols, rows }),
        [phone, map, cols, rows]
    );

    const fit = useMemo(
        () =>
            fitMapView(avail, win, {
                rotatable: phone,
                alwaysRotate: phone,
                bothWays: !phone,
                fillWidth: false,
                taller: 1,
                minCell: MIN_TAP_CELL_PX,
                cover: phone ? undefined : Infinity,
            }),
        [avail, win, phone]
    );

    const cameraMode = needsCamera(fit);

    const fitAll = useMemo(
        () =>
            cameraMode
                ? fitMapView(avail, win, {
                      rotatable: phone,
                      alwaysRotate: phone,
                      bothWays: false,
                      fillWidth: false,
                      taller: 1,
                      cover: phone ? undefined : Infinity,
                  })
                : fit,
        [cameraMode, avail, win, fit, phone]
    );

    const renderedFit = cameraMode ? fitAll : fit;

    const scrollsX = phone && fit.width > avail.width + 0.5;

    const scrollsY = phone && fit.height > avail.height + 0.5;

    const scrolls = scrollsX || scrollsY;

    const pxPerUnit =
        renderedFit.width /
        ((renderedFit.rotated ? win.rows : win.cols) * UNIT);

    const fitCell = viewCellPx(fitAll, win);

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
        fitCell,
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
