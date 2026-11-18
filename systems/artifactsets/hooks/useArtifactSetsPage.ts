'use client';

import { useArtifactSetsList } from './useArtifactSets';

import { useSearch } from '@/lib/hooks/common';
import type { ArtifactSetRow } from '@/systems/artifactsets/types';

const EMPTY_SETS: ArtifactSetRow[] = [];

const setFields = (set: ArtifactSetRow) => [set.name];

export function useArtifactSetsPage(campaignId: string) {
    const { data: sets = EMPTY_SETS } = useArtifactSetsList(campaignId);

    const search = useSearch(sets, setFields);

    return { sets: search.items, total: sets.length, search };
}
