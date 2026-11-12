'use client';

import { useCallback, useMemo, useRef } from 'react';

import { usePaletteToggle } from './usePaletteToggle';

import { MAP_MOTION_DEFAULT_SPEED } from '@/lib/constants/battle-motion';
import { clampMotionSpeed, resumeSpeed } from '@/lib/utils/battle/map-motion';
import type { MapMotionData } from '@/types/api';
import type { MapMotion, MapMotionAxis } from '@/types/battle';

export interface MapMotionTool {
    active: boolean;
    toggle(): void;
    close(): void;
    current: MapMotion | null;
    pending: boolean;
    setAxis(axis: MapMotionAxis): void;
    setSpeed(speed: number): void;
    reverse(): void;
    togglePaused(): void;
    turnOff(): void;
}

export function useMapMotionTool(args: {
    isDM: boolean;
    current: MapMotion | null;
    mutation: { mutate(data: MapMotionData): void; isPending: boolean };
}): MapMotionTool | null {
    const {
        isDM,
        current,
        mutation: { mutate, isPending },
    } = args;

    const { active, toggle, close } = usePaletteToggle();

    const last = useRef<number | null>(null);

    const send = useCallback(
        (next: MapMotion) => {
            if (next.axis === current?.axis && next.speed === current.speed)
                return;

            if (next.speed !== 0) last.current = next.speed;

            mutate({ motion: next });
        },
        [current, mutate]
    );

    const setAxis = useCallback(
        (axis: MapMotionAxis) =>
            send({
                axis,
                speed: current ? current.speed : MAP_MOTION_DEFAULT_SPEED,
            }),
        [current, send]
    );

    const setSpeed = useCallback(
        (speed: number) =>
            send({
                axis: current?.axis ?? 'x',
                speed: clampMotionSpeed(speed),
            }),
        [current, send]
    );

    const reverse = useCallback(() => {
        if (current && current.speed !== 0)
            send({ axis: current.axis, speed: -current.speed });
    }, [current, send]);

    const togglePaused = useCallback(() => {
        if (!current) return;

        if (current.speed !== 0) {
            last.current = current.speed;
            send({ axis: current.axis, speed: 0 });
        } else {
            send({ axis: current.axis, speed: resumeSpeed(last.current) });
        }
    }, [current, send]);

    const turnOff = useCallback(() => mutate({ motion: null }), [mutate]);

    const tool = useMemo(
        () => ({
            active,
            toggle,
            close,
            current,
            pending: isPending,
            setAxis,
            setSpeed,
            reverse,
            togglePaused,
            turnOff,
        }),
        [
            active,
            toggle,
            close,
            current,
            isPending,
            setAxis,
            setSpeed,
            reverse,
            togglePaused,
            turnOff,
        ]
    );

    return isDM ? tool : null;
}
