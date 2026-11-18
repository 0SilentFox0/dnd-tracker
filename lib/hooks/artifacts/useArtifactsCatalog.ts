'use client';

import { useMemo } from 'react';

import { useArtifactsList } from './useArtifacts';

import { ARTIFACT_SLOT_VALUES } from '@/lib/constants/artifacts';
import { useSearch } from '@/lib/hooks/common';
import { matchesQuery } from '@/lib/utils/common/text-search';
import type {
    ArtifactCardData,
    ArtifactListItem,
    ItemGroupsView,
} from '@/types/artifacts';

const EMPTY_ARTIFACTS: ArtifactListItem[] = [];

const NO_GROUPS: ItemGroupsView = { groups: [], isLoading: false };

const useNoGroups = (): ItemGroupsView => NO_GROUPS;

const artifactFields = (a: ArtifactListItem) => [a.name, a.artifactSet?.name];

const toCard = (a: ArtifactListItem): ArtifactCardData => ({
    id: a.id,
    name: a.name,
    slot: a.slot,
    rarity: a.rarity ?? null,
    icon: a.icon ?? null,
    description: a.description ?? null,
    abilitySummary: a.abilitySummary ?? [],
    artifactSet: a.artifactSet ?? null,
    itemKind: a.itemKind,
});

/** DM artifacts page: item groups (sets) with their artifacts and the ungrouped ones by slot, both from the list queries. */
export function useArtifactsCatalog(
    campaignId: string,
    useGroups: (campaignId: string) => ItemGroupsView = useNoGroups
) {
    const artifactsQuery = useArtifactsList(campaignId);

    const groupsQuery = useGroups(campaignId);

    const artifacts = artifactsQuery.data ?? EMPTY_ARTIFACTS;

    const { groups } = groupsQuery;

    const search = useSearch(artifacts, artifactFields);

    const { items: shown, isActive } = search;

    const query = search.query.value;

    const view = useMemo(() => {
        const cards = shown.map(toCard);

        const byGroup = groups
            .map((group) => ({
                group,
                artifacts: cards.filter((_, i) => shown[i].setId === group.id),
            }))
            .filter(
                ({ group, artifacts: own }) =>
                    !isActive ||
                    own.length > 0 ||
                    matchesQuery([group.name], query)
            );

        const ungrouped = cards.filter((_, i) => !shown[i].setId);

        const bySlot = ARTIFACT_SLOT_VALUES.map((slot) => ({
            slot,
            artifacts: ungrouped.filter((a) => a.slot === slot),
        })).filter((g) => g.artifacts.length > 0);

        return { groups: byGroup, bySlot };
    }, [shown, groups, isActive, query]);

    return {
        count: artifacts.length,
        isEmpty: artifacts.length === 0 && groups.length === 0,
        isLoading: artifactsQuery.isLoading || groupsQuery.isLoading,
        search,
        view,
    };
}
