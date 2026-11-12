'use client';

import { useMemo } from 'react';

import { useScenarioPages } from './useScenarioPages';

import { groupIndex } from '@/lib/utils/scenario/index-groups';

export function useSceneNeighbours(campaignId: string, pageId: string) {
    const { data } = useScenarioPages(campaignId);

    return useMemo(() => {
        const scenes = groupIndex(data ?? []).arcs.flatMap((a) => a.pages);

        const i = scenes.findIndex((p) => p.id === pageId);

        if (i < 0) return { prev: undefined, next: undefined };

        return { prev: scenes[i - 1], next: scenes[i + 1] };
    }, [data, pageId]);
}
