'use client';

import { useCallback, useMemo } from 'react';

import { usePaletteToggle } from './usePaletteToggle';

import type { MapWeatherData } from '@/types/api';
import type { WeatherKind } from '@/types/battle';

export interface MapWeatherTool {
    active: boolean;
    toggle(): void;
    close(): void;
    current: WeatherKind | null;
    pending: boolean;
    choose(kind: WeatherKind | null): void;
}

export function useMapWeatherTool(args: {
    isDM: boolean;
    current: WeatherKind | null;
    mutation: { mutate(data: MapWeatherData): void; isPending: boolean };
}): MapWeatherTool | null {
    const {
        isDM,
        current,
        mutation: { mutate, isPending },
    } = args;

    const { active, toggle, close } = usePaletteToggle();

    const choose = useCallback(
        (kind: WeatherKind | null) => {
            close();

            if (kind !== current) mutate({ weather: kind });
        },
        [current, mutate, close]
    );

    const tool = useMemo(
        () => ({ active, toggle, close, current, pending: isPending, choose }),
        [active, toggle, close, current, isPending, choose]
    );

    return isDM ? tool : null;
}
