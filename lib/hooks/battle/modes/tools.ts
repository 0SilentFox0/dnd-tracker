'use client';

import { useMazeModeTools } from './maze/useMazeModeTools';
import { useMazeDarkAutoSkip, useMazePlaceUnit } from './maze';

import { activeMapMode, type MapModeKey } from '@/lib/utils/battle/modes';
import type { AddParticipantData } from '@/types/battle-actions';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

export interface ModeTools {
    panLocked: boolean;
    toolActive: boolean;
    clickCell(cell: GridPoint): void;
    closeTool(): void;
    raw: unknown;
    paletteOpen: boolean;
}

type ByMode<T> = Partial<Record<string, T>>;

// hooks of every registry mode are called unconditionally: the map mode can change between renders
export function useModeTools(
    map: BattleMapConfig | null | undefined
): ModeTools | null {
    const results = { maze: useMazeModeTools() } satisfies Record<
        MapModeKey,
        ModeTools | null
    >;

    return (
        (results as ByMode<ModeTools | null>)[activeMapMode(map).key] ?? null
    );
}

export function useModeDmPlace(
    map: BattleMapConfig | null | undefined
): ((body: AddParticipantData) => void) | undefined {
    const results = { maze: useMazePlaceUnit() } satisfies Record<
        MapModeKey,
        ((body: AddParticipantData) => void) | undefined
    >;

    return (results as ByMode<(body: AddParticipantData) => void>)[
        activeMapMode(map).key
    ];
}

export function useModeAutoSkip(): void {
    void ({ maze: useMazeDarkAutoSkip() } satisfies Record<MapModeKey, void>);
}
