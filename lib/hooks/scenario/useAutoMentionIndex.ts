'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { scenarioKeys } from './keys';

import { getMentionNames } from '@/lib/api/scenario';
import {
    type AutoMentionIndex,
    buildAutoMentionIndex,
} from '@/lib/utils/scenario/auto-mentions';

export function useAutoMentionIndex(campaignId: string): {
    index: AutoMentionIndex | null;
    refresh: () => void;
} {
    const queryClient = useQueryClient();

    const queryKey = scenarioKeys.mentionNames(campaignId);

    const { data } = useQuery({
        queryKey,
        queryFn: () => getMentionNames(campaignId),
        // refetched once per editor mount so entities created on other pages are picked up
        staleTime: 0,
        refetchOnWindowFocus: false,
        select: buildAutoMentionIndex,
    });

    const refresh = useCallback(
        () =>
            void queryClient.invalidateQueries({
                queryKey: scenarioKeys.mentionNames(campaignId),
            }),
        [queryClient, campaignId]
    );

    return { index: data ?? null, refresh };
}
