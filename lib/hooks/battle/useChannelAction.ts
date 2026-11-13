'use client';

import { useState } from 'react';

import { useBattleScene } from './useBattleScene';

import { castPreviewOf } from '@/lib/utils/battle/flows';
import type { BattleParticipant } from '@/types/battle';

export function useChannelAction(hero: BattleParticipant, onDone?: () => void) {
    const {
        battle,
        actions: { system: channel },
    } = useBattleScene();

    const [open, setOpen] = useState(false);

    const [error, setError] = useState<string>();

    const preview = castPreviewOf(hero, battle.rules);

    const send = async (roll?: number) => {
        setError(undefined);

        try {
            await channel.mutateAsync({
                action: 'channel',
                body: {
                    participantId: hero.basicInfo.id,
                    ...(roll === undefined
                        ? { serverRoll: true as const }
                        : { roll }),
                },
            });
            setOpen(false);
            onDone?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : undefined);
        }
    };

    const view = {
        open,
        pending: channel.isPending,
        error,
        target: preview?.channelTarget ?? 0,
        banked: preview?.channelled ?? 0,
    };

    const actions = {
        open: () => {
            setError(undefined);
            setOpen(true);
        },
        close: () => setOpen(false),
        roll: (roll: number) => send(roll),
        auto: () => send(),
    };

    return { view, actions };
}
