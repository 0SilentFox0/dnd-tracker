"use client";

import { useMemo } from "react";

import { useArtifactSetsList } from "./useArtifactSets";

import { ARTIFACT_SLOT_OPTIONS } from "@/lib/constants/artifacts";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useSearch } from "@/lib/hooks/common";
import { matchesQuery } from "@/lib/utils/common/text-search";
import type { ArtifactSetCardData, ArtifactSetRow } from "@/types/artifact-sets";
import type { ArtifactCardData, ArtifactListItem } from "@/types/artifacts";

const EMPTY_ARTIFACTS: ArtifactListItem[] = [];

const EMPTY_SETS: ArtifactSetRow[] = [];

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

const toSetCard = (s: ArtifactSetRow): ArtifactSetCardData => ({
  id: s.id,
  name: s.name,
  icon: s.icon ?? null,
  description: s.description,
  setBonus: s.setBonus,
  abilitySummary: s.abilitySummary ?? [],
});

/** DM artifacts page: sets with their artifacts and the ungrouped ones by slot, both from the list queries. */
export function useArtifactsCatalog(campaignId: string) {
  const artifactsQuery = useArtifactsList(campaignId);

  const setsQuery = useArtifactSetsList(campaignId);

  const artifacts = artifactsQuery.data ?? EMPTY_ARTIFACTS;

  const sets = setsQuery.data ?? EMPTY_SETS;

  const search = useSearch(artifacts, artifactFields);

  const { items: shown, isActive } = search;

  const query = search.query.value;

  const view = useMemo(() => {
    const cards = shown.map(toCard);

    const bySet = sets
      .map((set) => ({ set: toSetCard(set), artifacts: cards.filter((_, i) => shown[i].setId === set.id) }))
      .filter(({ set, artifacts: own }) => !isActive || own.length > 0 || matchesQuery([set.name], query));

    const ungrouped = cards.filter((_, i) => !shown[i].setId);

    const bySlot = ARTIFACT_SLOT_OPTIONS.map(({ value, label }) => ({ slot: value, label, artifacts: ungrouped.filter((a) => a.slot === value) })).filter((g) => g.artifacts.length > 0);

    return { sets: bySet, bySlot };
  }, [shown, sets, isActive, query]);

  return {
    count: artifacts.length,
    isEmpty: artifacts.length === 0 && sets.length === 0,
    isLoading: artifactsQuery.isLoading || setsQuery.isLoading,
    search,
    view,
  };
}
