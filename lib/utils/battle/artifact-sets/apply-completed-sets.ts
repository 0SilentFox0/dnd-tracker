/**
 * Повні сети артефактів на учаснику: рядки сетів (для вмінь) і маркери HUD.
 */

import type { CampaignSpellContext } from "../types/participant";
import { type ArtifactSetBattleMaps, loadArtifactSetBattleMaps } from "./load-maps";

import type { ArtifactSetRowLike } from "@/lib/utils/abilities/build/collect";
import type { ArtifactSetHudMarker, EquippedArtifact } from "@/types/battle";

export async function findCompletedSets(
  equipped: EquippedArtifact[],
  campaignId: string,
  context?: CampaignSpellContext,
): Promise<{ sets: ArtifactSetRowLike[]; hudMarkers: ArtifactSetHudMarker[] }> {
  const equippedIds = new Set(equipped.map((a) => a.artifactId));

  const setIds = [...new Set(equipped.map((a) => a.setId).filter((id): id is string => !!id))];

  if (setIds.length === 0) return { sets: [], hudMarkers: [] };

  const maps: ArtifactSetBattleMaps =
    context?.artifactSetsById && context.artifactSetMemberIds && Object.keys(context.artifactSetsById).length > 0
      ? { artifactSetsById: context.artifactSetsById, artifactSetMemberIds: context.artifactSetMemberIds }
      : await loadArtifactSetBattleMaps(campaignId, setIds);

  const sets: ArtifactSetRowLike[] = [];

  const hudMarkers: ArtifactSetHudMarker[] = [];

  for (const setId of setIds) {
    const memberIds = maps.artifactSetMemberIds[setId];

    const row = maps.artifactSetsById[setId];

    if (!row || (row.setBonus == null && row.abilities == null) || !memberIds?.length || !memberIds.every((id) => equippedIds.has(id))) continue;

    sets.push({ id: row.id, name: row.name, icon: row.icon ?? null, setBonus: row.setBonus, abilities: row.abilities });
    hudMarkers.push({ setId, name: row.name, icon: row.icon ?? null });
  }

  return { sets, hudMarkers };
}
