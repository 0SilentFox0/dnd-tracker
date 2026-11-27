'use client';

import { useQuery } from '@tanstack/react-query';

import { scenarioKeys } from './keys';

import { getMentionNames } from '@/lib/api/scenario';
import {
    type AutoMentionIndex,
    buildAutoMentionIndex,
} from '@/lib/utils/scenario/auto-mentions';

const NAMES_STALE_MS = 10 * 60_000;

export function useAutoMentionIndex(
    campaignId: string
): AutoMentionIndex | null {
    const { data } = useQuery({
        queryKey: scenarioKeys.mentionNames(campaignId),
        queryFn: () => getMentionNames(campaignId),
        staleTime: NAMES_STALE_MS,
        refetchOnWindowFocus: false,
        select: buildAutoMentionIndex,
    });

    return data ?? null;
}
