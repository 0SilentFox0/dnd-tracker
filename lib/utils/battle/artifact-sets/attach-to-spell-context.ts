/**
 * Додає до CampaignSpellContext дані сетів за екіпірованими артефактами.
 */

import type { CampaignSpellContext } from "../types/participant";
import { loadArtifactSetBattleMaps } from "./load-maps";

export async function attachArtifactSetsToSpellContext(
  campaignId: string,
  context: CampaignSpellContext,
): Promise<void> {
  if (!context.artifactsById) return;

  const setIds = new Set<string>();

  for (const a of Object.values(context.artifactsById)) {
    if (a?.setId) setIds.add(a.setId);
  }

  if (setIds.size === 0) return;

  const maps = await loadArtifactSetBattleMaps(campaignId, [...setIds]);

  context.artifactSetsById = maps.artifactSetsById;
  context.artifactSetMemberIds = maps.artifactSetMemberIds;
}
