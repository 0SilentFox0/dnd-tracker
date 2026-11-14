'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { battleMapKeys } from './keys';

const channelName = (campaignId: string) => `map-library:${campaignId}`;

export function announceMapLibraryChange(campaignId: string) {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(channelName(campaignId));

    channel.postMessage('changed');
    channel.close();
}

/** Other tabs edit the library: refetch the list so map versions stay current. */
export function useMapLibrarySync(campaignId: string, enabled: boolean) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled || typeof BroadcastChannel === 'undefined') return;

        const channel = new BroadcastChannel(channelName(campaignId));

        channel.onmessage = () =>
            void queryClient.invalidateQueries({
                queryKey: battleMapKeys.list(campaignId),
            });

        return () => channel.close();
    }, [campaignId, enabled, queryClient]);
}
