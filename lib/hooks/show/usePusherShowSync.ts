'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { showKeys } from './keys';
import { writeShowSnapshot } from './show-snapshot';

import { SOUNDBOARD_PLAY_EVENT } from '@/lib/constants/soundboard';
import { usePusherChannel } from '@/lib/hooks/common';
import { armUnlock, handleSoundPlayEvent } from '@/lib/hooks/soundboard';
import { worldKeys } from '@/lib/hooks/world/keys';
import {
    SHOW_STATE_EVENT,
    showChannelName,
    WORLD_CHANGED_EVENT,
} from '@/lib/pusher/channels';
import type { ShowEvent, ShowSnapshot } from '@/types/show';
import type { WorldChangedEvent } from '@/types/world';

const WORLD_THROTTLE_MS = 1000;

export function usePusherShowSync(campaignId: string, enabled = true): void {
    const queryClient = useQueryClient();

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lastWorldSeq = useRef<number | null>(null);

    useEffect(armUnlock, []);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        []
    );

    const invalidateWorld = () => {
        for (const queryKey of [
            worldKeys.viewAll(campaignId),
            worldKeys.mapAll(campaignId),
            worldKeys.maps(campaignId),
            worldKeys.log(campaignId),
        ])
            void queryClient.invalidateQueries({ queryKey });
    };

    usePusherChannel(
        enabled ? showChannelName(campaignId) : null,
        {
            [SHOW_STATE_EVENT]: (data) => {
                const event = data as Partial<ShowEvent> | null;

                if (event?.show && typeof event.show.seq === 'number') {
                    writeShowSnapshot(queryClient, campaignId, {
                        show: event.show,
                    });

                    return;
                }

                // a restricted slide is not broadcast: re-read the own view
                if (typeof event?.seq !== 'number') return;

                const cachedSeq =
                    queryClient.getQueryData<ShowSnapshot>(
                        showKeys.state(campaignId)
                    )?.show?.seq ?? -1;

                if (event.seq > cachedSeq)
                    void queryClient.invalidateQueries({
                        queryKey: showKeys.state(campaignId),
                    });
            },
            [SOUNDBOARD_PLAY_EVENT]: (data) =>
                handleSoundPlayEvent(campaignId, data),
            [WORLD_CHANGED_EVENT]: (data) => {
                const seq = (data as Partial<WorldChangedEvent> | null)?.seq;

                if (typeof seq !== 'number' || seq === lastWorldSeq.current)
                    return;

                lastWorldSeq.current = seq;

                // trailing: the last event of a series gets into one refetch
                if (timer.current) return;

                timer.current = setTimeout(() => {
                    timer.current = null;
                    invalidateWorld();
                }, WORLD_THROTTLE_MS);
            },
        },
        {
            // the HTML state is older than the subscription: events in between would be lost
            onSubscribed: () => {
                void queryClient.invalidateQueries({
                    queryKey: showKeys.state(campaignId),
                });
                void queryClient.invalidateQueries({
                    queryKey: worldKeys.viewAll(campaignId),
                });
            },
            onError: (error) =>
                console.warn(
                    '[show-sync] show channel subscription failed',
                    error
                ),
        }
    );
}
