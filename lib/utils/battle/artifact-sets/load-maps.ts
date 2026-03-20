/**
 * Завантаження мап сетів для бою (старт бою / participant без контексту).
 */

import type { CampaignSpellContext } from "../types/participant";

import { prisma } from "@/lib/db";

export type ArtifactSetBattleMaps = {
  artifactSetsById: NonNullable<CampaignSpellContext["artifactSetsById"]>;
  artifactSetMemberIds: NonNullable<CampaignSpellContext["artifactSetMemberIds"]>;
};

export async function loadArtifactSetBattleMaps(
  campaignId: string,
  setIds: string[],
): Promise<ArtifactSetBattleMaps> {
  const empty: ArtifactSetBattleMaps = {
    artifactSetsById: {},
    artifactSetMemberIds: {},
  };

  if (setIds.length === 0) return empty;

  const [sets, memberRows] = await Promise.all([
    prisma.artifactSet.findMany({
      where: { campaignId, id: { in: setIds } },
    }),
    prisma.artifact.findMany({
      where: { campaignId, setId: { in: setIds } },
      select: { id: true, setId: true },
    }),
  ]);

  const artifactSetsById: ArtifactSetBattleMaps["artifactSetsById"] = {};

  for (const s of sets) {
    artifactSetsById[s.id] = {
      id: s.id,
      name: s.name,
      setBonus: s.setBonus,
      icon: s.icon ?? null,
    };
  }

  const artifactSetMemberIds: ArtifactSetBattleMaps["artifactSetMemberIds"] =
    {};

  for (const r of memberRows) {
    if (!r.setId) continue;

    if (!artifactSetMemberIds[r.setId]) artifactSetMemberIds[r.setId] = [];

    artifactSetMemberIds[r.setId].push(r.id);
  }

  return { artifactSetsById, artifactSetMemberIds };
}
