'use client';

import {
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { usePanPinch, useReducedMotion } from '@/lib/hooks/common';
import {
    type Camera,
    centerOn,
    clampCamera,
    easeCamera,
    fitAllCamera,
    type Frame,
    inComfort,
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
    follow: {
        currentId: string | null;
        target: CameraTarget | null;
        self: CameraTarget | null;
        enabled: boolean;
    };
}

const IDENTITY: Camera = { zoom: 1, x: 0, y: 0 };

const WHEEL_STEP = 1.1;

export function useMapCamera({
    enabled,
    frame,
    containerRef,
    panLocked,
    follow,
}: MapCameraOptions) {
    const [cameraState, setCameraState] = useState(IDENTITY);

    const [movedTurn, setMovedTurn] = useState<{ turnId: string | null } | null>(null);

    const userMoved = movedTurn?.turnId === follow.currentId;

    const initialized = useRef(false);

    const cameraRef = useRef(IDENTITY);

    const frameRef = useRef<Frame | null>(null);

    const animationRef = useRef<number | null>(null);

    const previousTurn = useRef(follow.currentId);

    const previousTarget = useRef(follow.target?.point ?? null);

    const reducedMotion = useReducedMotion();

    useEffect(() => {
        cameraRef.current = cameraState;
    }, [cameraState]);

    const cancelAnimation = useCallback(() => {
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    }, []);

    const updateCamera = useCallback((next: Camera) => {
        cameraRef.current = next;
        setCameraState(next);
    }, []);

    const markMoved = useCallback(() => {
        setMovedTurn({ turnId: follow.currentId });
    }, [follow.currentId]);

    const fly = useCallback((to: Camera) => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        cancelAnimation();

        if (reducedMotion) {
            updateCamera(clampCamera(to, activeFrame));

            return;
        }

        const from = cameraRef.current;

        const started = performance.now();

        const tick = (now: number) => {
            const currentFrame = frameRef.current;

            if (!currentFrame) return;

            const t = Math.min(1, (now - started) / 350);

            updateCamera(
                clampCamera(easeCamera(from, to, t, currentFrame.avail), currentFrame)
            );

            if (t < 1) animationRef.current = requestAnimationFrame(tick);
            else animationRef.current = null;
        };

        animationRef.current = requestAnimationFrame(tick);
    }, [cancelAnimation, reducedMotion, updateCamera]);

    const onPan = useCallback((dx: number, dy: number) => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        cancelAnimation();
        updateCamera(panBy(cameraRef.current, dx, dy, activeFrame));
        markMoved();
    }, [cancelAnimation, markMoved, updateCamera]);

    const onPinch = useCallback((step: { factor: number; mx: number; my: number; dmx: number; dmy: number }) => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        cancelAnimation();

        const zoomed = zoomAround(cameraRef.current, step.factor, { x: step.mx, y: step.my }, activeFrame);

        updateCamera(panBy(zoomed, step.dmx, step.dmy, activeFrame));
        markMoved();
    }, [cancelAnimation, markMoved, updateCamera]);

    const onWheel = useCallback((e: WheelEvent, rect: DOMRect) => {
        const activeFrame = frameRef.current;

        if (!enabled || !activeFrame) return;

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
    }, [cancelAnimation, enabled, markMoved, updateCamera]);

    const gestures = usePanPinch({
        enabled,
        panLocked,
        containerRef,
        onPan: (dx, dy) => onPan(dx, dy),
        onPinch: (step) => onPinch(step),
        onWheel,
    });

    useEffect(() => {
        if (!enabled || !frame) return;

        const previous = frameRef.current;

        frameRef.current = frame;

        if (!initialized.current) {
            const target = follow.self ?? follow.target;

            const initial = target
                ? centerOn(target.point, Math.max(1, frame.bounds.max / 3), frame)
                : fitAllCamera(frame);

            initialized.current = true;
            animationRef.current = requestAnimationFrame(() => {
                animationRef.current = null;
                updateCamera(initial);
            });

            return;
        }

        if (previous && previous !== frame) {
            cancelAnimation();

            const point = {
                x: (previous.avail.width / 2 - cameraRef.current.x) / cameraRef.current.zoom,
                y: (previous.avail.height / 2 - cameraRef.current.y) / cameraRef.current.zoom,
            };

            const resized = clampCamera(
                {
                    zoom: cameraRef.current.zoom,
                    x: frame.avail.width / 2 - point.x * cameraRef.current.zoom,
                    y: frame.avail.height / 2 - point.y * cameraRef.current.zoom,
                },
                frame
            );

            animationRef.current = requestAnimationFrame(() => {
                animationRef.current = null;
                updateCamera(resized);
            });
        }
    }, [enabled, frame, follow.self, follow.target, updateCamera, cancelAnimation]);

    useEffect(() => {
        if (!enabled || !initialized.current) return;

        if (previousTurn.current === follow.currentId) return;

        previousTurn.current = follow.currentId;
        previousTarget.current = follow.target?.point ?? null;

        if (follow.enabled && follow.target && frame) {
            fly(centerOn(follow.target.point, Math.max(cameraRef.current.zoom, frame.bounds.max / 3), frame));
        }
    }, [enabled, follow.currentId, follow.enabled, follow.target, frame, fly]);

    useEffect(() => {
        const point = follow.target?.point ?? null;

        const previous = previousTarget.current;

        previousTarget.current = point;

        if (
            !enabled || !initialized.current || !follow.enabled || userMoved || !point ||
            !previous || !frame || (point.x === previous.x && point.y === previous.y)
        ) return;

        if (!inComfort(cameraRef.current, point, frame)) {
            fly(centerOn(point, cameraRef.current.zoom, frame));
        }
    }, [enabled, follow.enabled, follow.target?.point, frame, userMoved, fly]);

    useEffect(() => () => cancelAnimation(), [cancelAnimation]);

    const focusPoint = useCallback((point: { x: number; y: number }, options?: { zoom?: number; animate?: boolean }) => {
        if (!frameRef.current) return;

        cancelAnimation();

        const to = centerOn(point, options?.zoom ?? cameraRef.current.zoom, frameRef.current);

        if (options?.animate) fly(to);
        else updateCamera(to);
    }, [cancelAnimation, fly, updateCamera]);

    const recenter = useCallback(() => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        cancelAnimation();

        const target = follow.self ?? follow.target;

        updateCamera(
            target
                ? centerOn(target.point, Math.max(cameraRef.current.zoom, activeFrame.bounds.max / 3), activeFrame)
                : fitAllCamera(activeFrame)
        );
        setMovedTurn(null);
    }, [cancelAnimation, follow.self, follow.target, updateCamera]);

    const zoomBy = useCallback((factor: number) => {
        const activeFrame = frameRef.current;

        const rect = containerRef.current?.getBoundingClientRect();

        if (!activeFrame || !rect) return;

        cancelAnimation();
        updateCamera(zoomAround(cameraRef.current, factor, { x: rect.width / 2, y: rect.height / 2 }, activeFrame));
        markMoved();
    }, [cancelAnimation, containerRef, markMoved, updateCamera]);

    const flyToMinimap = useCallback((nx: number, ny: number) => {
        const activeFrame = frameRef.current;

        if (!activeFrame) return;

        markMoved();
        fly(centerOn(minimapPointToContent(nx, ny, activeFrame), cameraRef.current.zoom, activeFrame));
    }, [fly, markMoved]);

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
