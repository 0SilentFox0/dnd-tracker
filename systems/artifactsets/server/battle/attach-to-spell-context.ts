import { loadArtifactSetBattleMaps } from "./load-maps";

import type { ContextPreparer } from "@/lib/server/systems/types";

export const attachArtifactSetsToSpellContext: ContextPreparer = async (campaignId, context) => {
  if (!context.artifactsById) return;

  const setIds = new Set<string>();

  for (const a of Object.values(context.artifactsById)) {
    if (a?.setId) setIds.add(a.setId);
  }

  if (setIds.size === 0) return;

  const maps = await loadArtifactSetBattleMaps(campaignId, [...setIds]);

  context.artifactSetsById = maps.artifactSetsById;
  context.artifactSetMemberIds = maps.artifactSetMemberIds;
};
