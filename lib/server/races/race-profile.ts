import { Prisma } from "@prisma/client";

import "server-only";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { assertCampaignRefs } from "@/lib/server/campaigns/campaign-refs";
import { ContentError } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import { SpeciesProfileSchema } from "@/lib/utils/rules/systems/schemas";

export type RaceProfileItem = { raceId: string; profile: SpeciesProfile };

export async function listRaceProfiles(campaignId: string): Promise<RaceProfileItem[]> {
  const rows = await prisma.race.findMany({ where: { campaignId }, select: { id: true, profile: true } });

  return rows.flatMap(({ id, profile }) => {
    const parsed = SpeciesProfileSchema.safeParse(profile);

    return parsed.success ? [{ raceId: id, profile: parsed.data as SpeciesProfile }] : [];
  });
}

export async function saveRaceProfile(campaignId: string, raceId: string, profile: SpeciesProfile): Promise<RaceProfileItem> {
  const race = await prisma.race.findFirst({ where: { id: raceId, campaignId }, select: { id: true } });

  if (!race) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

  await assertCampaignRefs(campaignId, {
    career: profile.careerTable.map((r) => r.careerId),
    feat: [...profile.talents, ...profile.randomTalents.map((r) => r.featId)],
  });

  await withCampaignContentWrite(campaignId, async () => {
    await prisma.race.update({ where: { id: raceId }, data: { profile: profile as unknown as Prisma.InputJsonValue } });
    afterContentCommit(() => invalidateReference(ReferenceKind.RACES, campaignId));
  });

  return { raceId, profile };
}
