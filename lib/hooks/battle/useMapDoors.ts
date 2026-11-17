'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { MapDoorToggleData } from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type { DoorState } from '@/types/battle-grid';

export interface MapDoorsTool {
    showLock: boolean;
    menu: string | null;
    press(edge: string, door: DoorState): void;
    act(edge: string, patch: Pick<MapDoorToggleData, 'open' | 'locked'>): void;
    close(): void;
}

/** Player tap toggles a door with the current hero; the DM gets a menu with open/close and lock/unlock. */
export function useMapDoors(args: {
    isDM: boolean;
    current?: BattleParticipant;
    isMyTurn: boolean;
    mutation: { mutate(data: MapDoorToggleData): void };
    notify(message: string): void;
}): MapDoorsTool {
    const { isDM, current, isMyTurn, mutation, notify } = args;

    const { mutate } = mutation;

    const t = useTranslations('battle.map.doors');

    const [menu, setMenu] = useState<string | null>(null);

    const close = useCallback(() => setMenu(null), []);

    const press = useCallback(
        (edge: string, door: DoorState) => {
            if (isDM) return setMenu((m) => (m === edge ? null : edge));

            if (!isMyTurn || !current) return notify(t('notYourTurn'));

            mutate({
                edge,
                open: !door.open,
                actorId: current.basicInfo.id,
            });
        },
        [isDM, isMyTurn, current, mutate, notify, t]
    );

    const act = useCallback(
        (edge: string, patch: Pick<MapDoorToggleData, 'open' | 'locked'>) => {
            mutate({ edge, ...patch });
            setMenu(null);
        },
        [mutate]
    );

    return useMemo(
        () => ({ showLock: isDM, menu, press, act, close }),
        [isDM, menu, press, act, close]
    );
}
