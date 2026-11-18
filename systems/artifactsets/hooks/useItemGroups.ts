'use client';

import { useMemo } from 'react';

import { useArtifactSetsList } from './useArtifactSets';

import type { ArtifactSetCardData } from '@/systems/artifactsets/types';
import type { ItemGroupsView } from '@/types/artifacts';

const EMPTY_SETS: ArtifactSetCardData[] = [];

export function useItemGroups(campaignId: string): ItemGroupsView {
    const { data, isLoading } = useArtifactSetsList(campaignId);

    const groups = useMemo(
        () =>
            data
                ? data.map((s) => ({
                      id: s.id,
                      name: s.name,
                      icon: s.icon ?? null,
                      description: s.description,
                      setBonus: s.setBonus,
                      abilitySummary: s.abilitySummary ?? [],
                  }))
                : EMPTY_SETS,
        [data]
    );

    return { groups, isLoading };
}
