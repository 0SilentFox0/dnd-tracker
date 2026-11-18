'use client';

import {
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { useReducedMotion } from '@/lib/hooks/common';
import {
    type Camera,
    clampCamera,
    easeCamera,
    type Frame,
} from '@/lib/utils/battle/camera';

export const IDENTITY: Camera = { zoom: 1, x: 0, y: 0 };

export function useCameraFlight(frameRef: RefObject<Frame | null>) {
    const [cameraState, setCameraState] = useState(IDENTITY);

    const cameraRef = useRef(IDENTITY);

    const animationRef = useRef<number | null>(null);

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
        setCameraState((prev) =>
            prev.zoom === next.zoom && prev.x === next.x && prev.y === next.y
                ? prev
                : next
        );
    }, []);

    const fly = useCallback(
        (to: Camera) => {
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
                    clampCamera(
                        easeCamera(from, to, t, currentFrame.avail),
                        currentFrame
                    )
                );

                if (t < 1) animationRef.current = requestAnimationFrame(tick);
                else animationRef.current = null;
            };

            animationRef.current = requestAnimationFrame(tick);
        },
        [cancelAnimation, frameRef, reducedMotion, updateCamera]
    );

    useEffect(() => () => cancelAnimation(), [cancelAnimation]);

    return {
        cameraState,
        cameraRef,
        animationRef,
        cancelAnimation,
        updateCamera,
        fly,
    };
}
