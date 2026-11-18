'use client';

import { type RefObject, useEffect, useRef } from 'react';

import type { useCameraFlight } from './useCameraFlight';
import type { CameraTarget } from './useMapCamera';

import {
    centerOn,
    clampCamera,
    fitAllCamera,
    type Frame,
    inComfort,
} from '@/lib/utils/battle/camera';

type Flight = ReturnType<typeof useCameraFlight>;

export interface CameraFollowOptions {
    enabled: boolean;
    frame: Frame | null;
    frameRef: RefObject<Frame | null>;
    userMoved: boolean;
    follow: {
        currentId: string | null;
        target: CameraTarget | null;
        self: CameraTarget | null;
        enabled: boolean;
    };
    flight: Pick<
        Flight,
        | 'cameraRef'
        | 'animationRef'
        | 'cancelAnimation'
        | 'updateCamera'
        | 'fly'
    >;
}

export function useCameraFollow({
    enabled,
    frame,
    frameRef,
    userMoved,
    follow,
    flight: { cameraRef, animationRef, cancelAnimation, updateCamera, fly },
}: CameraFollowOptions) {
    const initialized = useRef(false);

    const previousTurn = useRef(follow.currentId);

    const previousTarget = useRef(follow.target?.point ?? null);

    useEffect(() => {
        if (!enabled || !frame) return;

        const previous = frameRef.current;

        frameRef.current = frame;

        if (!initialized.current) {
            const target = follow.self ?? follow.target;

            const initial = target
                ? centerOn(
                      target.point,
                      Math.max(1, frame.bounds.max / 3),
                      frame
                  )
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
                x:
                    (previous.avail.width / 2 - cameraRef.current.x) /
                    cameraRef.current.zoom,
                y:
                    (previous.avail.height / 2 - cameraRef.current.y) /
                    cameraRef.current.zoom,
            };

            const resized = clampCamera(
                {
                    zoom: cameraRef.current.zoom,
                    x: frame.avail.width / 2 - point.x * cameraRef.current.zoom,
                    y:
                        frame.avail.height / 2 -
                        point.y * cameraRef.current.zoom,
                },
                frame
            );

            animationRef.current = requestAnimationFrame(() => {
                animationRef.current = null;
                updateCamera(resized);
            });
        }
    }, [
        animationRef,
        cameraRef,
        enabled,
        frame,
        frameRef,
        follow.self,
        follow.target,
        updateCamera,
        cancelAnimation,
    ]);

    useEffect(() => {
        if (!enabled || !initialized.current) return;

        if (previousTurn.current === follow.currentId) return;

        previousTurn.current = follow.currentId;
        previousTarget.current = follow.target?.point ?? null;

        if (follow.enabled && follow.target && frame) {
            fly(
                centerOn(
                    follow.target.point,
                    Math.max(cameraRef.current.zoom, frame.bounds.max / 3),
                    frame
                )
            );
        }
    }, [
        cameraRef,
        enabled,
        follow.currentId,
        follow.enabled,
        follow.target,
        frame,
        fly,
    ]);

    useEffect(() => {
        const point = follow.target?.point ?? null;

        const previous = previousTarget.current;

        previousTarget.current = point;

        if (
            !enabled ||
            !initialized.current ||
            !follow.enabled ||
            userMoved ||
            !point ||
            !previous ||
            !frame ||
            (point.x === previous.x && point.y === previous.y)
        )
            return;

        if (!inComfort(cameraRef.current, point, frame)) {
            fly(centerOn(point, cameraRef.current.zoom, frame));
        }
    }, [
        cameraRef,
        enabled,
        follow.enabled,
        follow.target?.point,
        frame,
        userMoved,
        fly,
    ]);
}
