import type { CampaignSpellContext } from "../types/participant";
import { type ArtifactSetBattleMaps, loadArtifactSetBattleMaps } from "./load-maps";

import type { ArtifactSetRowLike } from "@/lib/utils/abilities/build/collect";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import type { EquippedArtifact } from "@/types/battle";
import type { SetProgress } from "@/types/characters";

export type { SetProgress };

const hasEffect = (row: { setBonus: unknown; abilities?: unknown }) => row.setBonus != null || (Array.isArray(row.abilities) && row.abilities.length > 0);

const setIdsOf = (equipped: Pick<EquippedArtifact, "setId">[]) => [...new Set(equipped.map((a) => a.setId).filter((id): id is string => !!id))];

export function findSetProgress(equipped: Pick<EquippedArtifact, "artifactId" | "setId">[], maps: ArtifactSetBattleMaps): SetProgress[] {
  const equippedIds = new Set(equipped.map((a) => a.artifactId));

  return setIdsOf(equipped).flatMap((setId) => {
    const row = maps.artifactSetsById[setId];

    const members = maps.artifactSetMemberIds[setId] ?? [];

    if (!row || members.length === 0 || !hasEffect(row)) return [];

    const have = members.filter((id) => equippedIds.has(id)).length;

    return [{ setId, name: row.name, have, total: members.length, complete: have === members.length, effects: abilitySummary("artifactSet", row) }];
  });
}

export async function findCompletedSets(
  equipped: EquippedArtifact[],
  campaignId: string,
  context?: CampaignSpellContext,
): Promise<{ sets: ArtifactSetRowLike[]; progress: SetProgress[] }> {
  const setIds = setIdsOf(equipped);

  if (setIds.length === 0) return { sets: [], progress: [] };

  const maps: ArtifactSetBattleMaps =
    context?.artifactSetsById && context.artifactSetMemberIds && Object.keys(context.artifactSetsById).length > 0
      ? { artifactSetsById: context.artifactSetsById, artifactSetMemberIds: context.artifactSetMemberIds }
      : await loadArtifactSetBattleMaps(campaignId, setIds);

  const progress = findSetProgress(equipped, maps);

  const sets = progress
    .filter((p) => p.complete)
    .map(({ setId }) => {
      const row = maps.artifactSetsById[setId];

      return { id: row.id, name: row.name, icon: row.icon ?? null, setBonus: row.setBonus, abilities: row.abilities };
    });

  return { sets, progress };
}
