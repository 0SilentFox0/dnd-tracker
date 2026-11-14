'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { DRAG_THRESHOLD, usePanPinch } from './usePanPinch';

import {
    clampOffset,
    focusAt,
    INITIAL_VIEWPORT,
    type Viewport,
    zoomAt,
    type ZoomBounds,
} from '@/lib/utils/common/viewport-math';

const DEFAULT_MIN_ZOOM = 1;

const DEFAULT_MAX_ZOOM = 3;

const WHEEL_STEP = 1.1;

export { DRAG_THRESHOLD };

export interface ViewportOptions {
    /** один палець не тягне карту (малювання місцевості), щипок масштабує як завжди */
    panLocked?: boolean;
    /** контейнер карти прокручується: без зуму колесо гортає його, а масштабує лише з Ctrl/⌘ */
    wheelScrolls?: boolean;
    enabled?: boolean;
    minZoom?: number;
    maxZoom?: number;
}

export function useViewport({
    panLocked = false,
    wheelScrolls = false,
    enabled = true,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
}: ViewportOptions = {}) {
    const [view, setView] = useState<Viewport>(INITIAL_VIEWPORT);

    const bounds = useRef<ZoomBounds>({ min: minZoom, max: maxZoom });

    useEffect(() => {
        bounds.current = { min: minZoom, max: maxZoom };
    }, [minZoom, maxZoom]);

    const containerRef = useRef<HTMLDivElement>(null);

    const gestures = usePanPinch({
        panLocked,
        enabled,
        containerRef,
        onPan: (dx, dy, rect) => {
            setView((v) =>
                v.zoom > 1
                    ? {
                          ...v,
                          x: clampOffset(v.x + dx, v.zoom, rect.width),
                          y: clampOffset(v.y + dy, v.zoom, rect.height),
                      }
                    : v
            );
        },
        onPinch: ({ factor, mx, my }, rect) => {
            setView((v) =>
                zoomAt(v, v.zoom * factor, mx, my, rect.width, rect.height, bounds.current)
            );
        },
        onWheel: (e, rect) => {
            if (wheelScrolls && view.zoom === 1 && !e.ctrlKey && !e.metaKey)
                return;

            e.preventDefault();

            const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;

            setView((v) =>
                zoomAt(
                    v,
                    v.zoom * factor,
                    e.clientX - rect.left,
                    e.clientY - rect.top,
                    rect.width,
                    rect.height,
                    bounds.current
                )
            );
        },
    });

    const reset = useCallback(() => setView(INITIAL_VIEWPORT), []);

    const zoomBy = useCallback((factor: number) => {
        const el = containerRef.current;

        const rect = el?.getBoundingClientRect();

        const w = rect?.width ?? 0;

        const h = rect?.height ?? 0;

        setView((v) =>
            zoomAt(v, v.zoom * factor, w / 2, h / 2, w, h, bounds.current)
        );
    }, []);

    const focusOn = useCallback((nx: number, ny: number, zoom: number) => {
        const rect = containerRef.current?.getBoundingClientRect();

        const w = rect?.width ?? 0;

        const h = rect?.height ?? 0;

        setView((v) => focusAt(v, nx, ny, zoom, w, h, bounds.current));
    }, []);

    return {
        zoom: view.zoom,
        offset: { x: view.x, y: view.y },
        containerRef,
        wasDragged: gestures.wasDragged,
        bind: gestures.bind,
        reset,
        zoomBy,
        focusOn,
    };
}
