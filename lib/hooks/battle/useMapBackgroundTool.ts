'use client';

import { useCallback, useMemo } from 'react';

import { usePaletteToggle } from './usePaletteToggle';

import type { MapBackgroundData } from '@/types/api';

export interface MapBackgroundTool {
    active: boolean;
    toggle(): void;
    close(): void;
    current: string | null;
    pending: boolean;
    choose(background: string | null): void;
}

export function useMapBackgroundTool(args: {
    isDM: boolean;
    current: string | null;
    mutation: { mutate(data: MapBackgroundData): void; isPending: boolean };
}): MapBackgroundTool | null {
    const {
        isDM,
        current,
        mutation: { mutate, isPending },
    } = args;

    const { active, toggle, close } = usePaletteToggle();

    const choose = useCallback(
        (background: string | null) => {
            if (background !== current) mutate({ background });
        },
        [current, mutate]
    );

    const tool = useMemo(
        () => ({ active, toggle, close, current, pending: isPending, choose }),
        [active, toggle, close, current, isPending, choose]
    );

    return isDM ? tool : null;
}
