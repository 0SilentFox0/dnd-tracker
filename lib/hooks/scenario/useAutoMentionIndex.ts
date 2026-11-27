'use client';

import { useQuery } from '@tanstack/react-query';

import { scenarioKeys } from './keys';

import { getMentionNames } from '@/lib/api/scenario';
import {
    type AutoMentionIndex,
    buildAutoMentionIndex,
} from '@/lib/utils/scenario/auto-mentions';

export function useAutoMentionIndex(
    campaignId: string
): AutoMentionIndex | null {
    const { data } = useQuery({
        queryKey: scenarioKeys.mentionNames(campaignId),
        queryFn: () => getMentionNames(campaignId),
        // refetched once per editor mount so entities created on other pages are picked up
        staleTime: 0,
        refetchOnWindowFocus: false,
        select: buildAutoMentionIndex,
    });

    return data ?? null;
}
