'use client';

import { type RefObject, useCallback, useRef, useState } from 'react';

import { IDENTITY, useCameraFlight } from './useCameraFlight';
import { useCameraFollow } from './useCameraFollow';

import { usePanPinch } from '@/lib/hooks/common';
import {
    centerOn,
    fitAllCamera,
    focusZoomOf,
    type Frame,
    minimapPointToContent,
    panBy,
    zoomAround,
} from '@/lib/utils/battle/camera';

export interface CameraTarget {
    point: { x: number; y: number };
}

export interface MapCameraOptions {
    enabled: boolean;
    frame: Frame | null;
    containerRef: RefObject<HTMLDivElement | null>;
    panLocked: boolean;
    modeKey?: unknown;
    /** wheel scrolls the page container until zoomed; zoom needs Ctrl/Cmd */
    wheelScrolls?: boolean;
    follow: {
        currentId: string | null;
        target: CameraTarget | null;
        self: CameraTarget | null;
        enabled: boolean;
        /** where the initial camera looks when `startOverview` is off or there is no turn target */
        overview?: CameraTarget | null;
        /** initial camera shows the whole content instead of the turn target */
        startOverview?: boolean;
    };
}

const WHEEL_STEP = 1.1;

export function useMapCamera({
    enabled,
    frame,
    containerRef,
    panLocked,
    modeKey,
    wheelScrolls = false,
    follow,
}: MapCameraOptions) {
    const [movedTurn, setMovedTurn] = useState<{
        turnId: string | null;
    } | null>(null);

    const userMoved = movedTurn?.turnId === follow.currentId;

    const frameRef = useRef<Frame | null>(null);

    const flight = useCameraFlight(frameRef);

    const { cameraState, cameraRef, cancelAnimation, updateCamera, fly } =
        flight;

    const markMoved = useCallback(() => {
        setMovedTurn((prev) =>
            prev?.turnId === follow.currentId
                ? prev
                : { turnId: follow.currentId }
        );
    }, [follow.currentId]);

    const onPan = useCallback(
        (dx: number, dy: number) => {
            const activeFrame = frameRef.current;

            if (!activeFrame) return;

            cancelAnimation();
            updateCamera(panBy(cameraRef.current, dx, dy, activeFrame));
            markMoved();
        },
        [cameraRef, cancelAnimation, frameRef, markMoved, updateCamera]
    );

    const onPinch = useCallback(
        (step: {
            factor: number;
            mx: number;
            my: number;
            dmx: number;
            dmy: number;
        }) => {
            const activeFrame = frameRef.current;

            if (!activeFrame) return;

            cancelAnimation();

            const zoomed = zoomAround(
                cameraRef.current,
                step.factor,
                { x: step.mx, y: step.my },
                activeFrame
            );

            updateCamera(panBy(zoomed, step.dmx, step.dmy, activeFrame));
            markMoved();
        },
        [cameraRef, cancelAnimation, frameRef, markMoved, updateCamera]
    );

    const onWheel = useCallback(
        (e: WheelEvent, rect: DOMRect) => {
            const activeFrame = frameRef.current;

            if (!enabled || !activeFrame) return;

            if (
                wheelScrolls &&
                cameraRef.current.zoom === 1 &&
                !e.ctrlKey &&
                !e.metaKey
            )
                return;

            e.preventDefault();
            cancelAnimation();
            updateCamera(
                zoomAround(
                    cameraRef.current,
                    e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP,
                    { x: e.clientX - rect.left, y: e.clientY - rect.top },
                    activeFrame
                )
            );
            markMoved();
        },
        [
            cameraRef,
            cancelAnimation,
            enabled,
            frameRef,
            markMoved,
            updateCamera,
            wheelScrolls,
        ]
    );

    const gestures = usePanPinch({
        enabled,
        panLocked,
        containerRef,
        onPan: (dx, dy) => onPan(dx, dy),
        onPinch: (step) => onPinch(step),
        onWheel,
    });

    useCameraFollow({
        enabled,
        modeKey,
        frame,
        frameRef,
        userMoved,
        follow,
        flight,
    });

    const focusPoint = useCallback(
        (
            point: { x: number; y: number },
            options?: { zoom?: number; animate?: boolean }
        ) => {
            if (!frameRef.current) return;

            cancelAnimation();

            const to = centerOn(
                point,
                options?.zoom ?? cameraRef.current.zoom,
                frameRef.current
            );

            if (options?.animate) fly(to);
            else updateCamera(to);
        },
        [cameraRef, cancelAnimation, fly, frameRef, updateCamera]
    );

    const recenter = useCallback(() => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        cancelAnimation();

        const target = follow.self ?? follow.target;

        updateCamera(
            target
                ? centerOn(
                      target.point,
                      Math.max(
                          cameraRef.current.zoom,
                          focusZoomOf(activeFrame)
                      ),
                      activeFrame
                  )
                : follow.overview
                  ? centerOn(follow.overview.point, 1, activeFrame)
                  : fitAllCamera(activeFrame)
        );
        setMovedTurn(null);
    }, [
        cameraRef,
        cancelAnimation,
        follow.self,
        follow.target,
        follow.overview,
        frameRef,
        updateCamera,
    ]);

    const zoomBy = useCallback(
        (factor: number) => {
            const activeFrame = frameRef.current;

            const rect = containerRef.current?.getBoundingClientRect();

            if (!activeFrame || !rect) return;

            cancelAnimation();
            updateCamera(
                zoomAround(
                    cameraRef.current,
                    factor,
                    { x: rect.width / 2, y: rect.height / 2 },
                    activeFrame
                )
            );
            markMoved();
        },
        [
            cameraRef,
            cancelAnimation,
            containerRef,
            frameRef,
            markMoved,
            updateCamera,
        ]
    );

    const flyToMinimap = useCallback(
        (nx: number, ny: number) => {
            const activeFrame = frameRef.current;

            if (!activeFrame) return;

            markMoved();
            fly(
                centerOn(
                    minimapPointToContent(nx, ny, activeFrame),
                    cameraRef.current.zoom,
                    activeFrame
                )
            );
        },
        [cameraRef, fly, frameRef, markMoved]
    );

    return {
        camera: enabled ? cameraState : IDENTITY,
        bind: gestures.bind,
        wasDragged: gestures.wasDragged,
        userMoved,
        focusPoint,
        recenter,
        zoomBy,
        flyToMinimap,
    };
}
