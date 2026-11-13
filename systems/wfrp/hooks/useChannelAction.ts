'use client';

import { useState } from 'react';

import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { castPreviewOf } from '@/lib/utils/battle/flows';
import type { BattleParticipant } from '@/types/battle';

export function useChannelAction(
    hero: BattleParticipant,
    { onClose, onDone }: { onClose: () => void; onDone?: () => void }
) {
    const {
        battle,
        actions: { system: channel },
    } = useBattleScene();

    const [error, setError] = useState<string>();

    const preview = castPreviewOf(hero, battle.rules);

    const close = () => {
        setError(undefined);
        onClose();
    };

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
            onClose();
            onDone?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : undefined);
        }
    };

    const view = {
        pending: isSystemActionPending(channel, 'channel'),
        error,
        target: preview?.channelTarget ?? 0,
        banked: preview?.channelled ?? 0,
    };

    const actions = {
        close,
        roll: (roll: number) => send(roll),
        auto: () => send(),
    };

    return { view, actions };
}
