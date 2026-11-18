import { useMemo } from 'react';

import {
    cameraBounds,
    type Frame,
    needsCamera,
} from '@/lib/utils/battle/camera';
import {
    fitMapView,
    MIN_TAP_CELL_PX,
    playableBounds,
    UNIT,
} from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

const FIT_ZOOM_BOUNDS = { min: 1, max: 3 };

const DESKTOP_MAX_TALLER = 1.4;

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
                bothWays: !phone,
                fillWidth: phone,
                taller: phone ? 1 : DESKTOP_MAX_TALLER,
                minCell: MIN_TAP_CELL_PX,
            }),
        [avail, win, phone]
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
                  })
                : fit,
        [cameraMode, avail, win, fit]
    );

    const renderedFit = cameraMode ? fitAll : fit;

    const scrollsX = fit.width > avail.width + 0.5;

    const scrollsY = fit.height > avail.height + 0.5;

    const scrolls = scrollsX || scrollsY;

    const pxPerUnit = renderedFit.width / (win.cols * UNIT);

    const frame = useMemo<Frame | null>(() => {
        if (avail.width <= 0 || avail.height <= 0) return null;

        if (!cameraMode)
            return {
                avail: { width: fit.width, height: fit.height },
                content: { width: fit.width, height: fit.height },
                bounds: FIT_ZOOM_BOUNDS,
            };

        return {
            avail,
            content: { width: fitAll.width, height: fitAll.height },
            bounds: cameraBounds(fitAll.width / win.cols),
        };
    }, [
        cameraMode,
        avail,
        fit.width,
        fit.height,
        fitAll.width,
        fitAll.height,
        win.cols,
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
